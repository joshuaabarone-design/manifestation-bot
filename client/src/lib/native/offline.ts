import { Preferences } from "@capacitor/preferences";
import { Network } from "@capacitor/network";
import type { QueryClient } from "@tanstack/react-query";
import { isNative } from "../platform";
import { secureGet, secureSet, secureRemove } from "../secure-store";
import { apiFetch } from "../api";

/**
 * Offline support for the iOS app:
 *  - a read cache of affirmations, goals, journal and rituals (plus the profile, streaks and
 *    reminder settings needed to render them), and
 *  - a queue of journal entries written while offline, replayed with their clientId.
 * Everything is AES-GCM encrypted; the key lives in the Keychain, the ciphertext in Preferences.
 * On the web nothing is persisted.
 */
const CACHE_KEY = "mb.offlineCache.v1";
const QUEUE_KEY = "mb.journalQueue.v1";
const KEY_NAME = "mb.cacheKey";

export const CACHED_QUERY_KEYS = [
  "/api/auth/user",
  "/api/affirmations",
  "/api/goals",
  "/api/journal",
  "/api/rituals",
  "/api/streaks",
  "/api/reminders/settings",
];

const enabled = () => isNative && typeof crypto !== "undefined" && !!crypto.subtle;

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = await secureGet(KEY_NAME);
      if (stored) return crypto.subtle.importKey("raw", unb64(stored), "AES-GCM", false, ["encrypt", "decrypt"]);
      const raw = crypto.getRandomValues(new Uint8Array(32));
      await secureSet(KEY_NAME, b64(raw));
      return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
    })();
    keyPromise.catch(() => (keyPromise = null));
  }
  return keyPromise;
}

async function writeEncrypted(name: string, value: unknown): Promise<void> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  await Preferences.set({ key: name, value: `${b64(iv)}.${b64(ct)}` });
}

async function readEncrypted<T>(name: string): Promise<T | null> {
  const { value } = await Preferences.get({ key: name });
  if (!value) return null;
  try {
    const [iv, ct] = value.split(".");
    const key = await getKey();
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    await Preferences.remove({ key: name }); // unreadable (e.g. key rotated): drop it
    return null;
  }
}

// ---- Read cache ----

interface CacheSnapshot {
  savedAt: number;
  entries: { key: string; data: unknown }[];
}

/** Restores the last cached data before first render; marks it stale so it refetches online. */
export async function hydrateOfflineCache(qc: QueryClient): Promise<void> {
  if (!enabled()) return;
  const snap = await readEncrypted<CacheSnapshot>(CACHE_KEY).catch(() => null);
  if (!snap) return;
  for (const e of snap.entries) {
    if (CACHED_QUERY_KEYS.includes(e.key)) qc.setQueryData([e.key], e.data, { updatedAt: snap.savedAt });
  }
  await qc.invalidateQueries({ refetchType: "none" });
}

/** Keeps the encrypted snapshot up to date as cached queries change. Returns an unsubscribe. */
export function persistOfflineCache(qc: QueryClient): () => void {
  if (!enabled()) return () => undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = () => {
    const entries = CACHED_QUERY_KEYS.flatMap((key) => {
      const data = qc.getQueryData([key]);
      return data === undefined ? [] : [{ key, data }];
    });
    // Signed out: never keep another session's data around.
    if (!qc.getQueryData(["/api/auth/user"])) {
      void Preferences.remove({ key: CACHE_KEY });
      return;
    }
    void writeEncrypted(CACHE_KEY, { savedAt: Date.now(), entries } satisfies CacheSnapshot).catch(() => undefined);
  };
  return qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    const k = event.query.queryKey;
    if (k.length !== 1 || !CACHED_QUERY_KEYS.includes(String(k[0]))) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 800);
  });
}

// ---- Queued journal writes ----

interface QueuedJournal {
  clientId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

export function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function isLikelyOffline(): Promise<boolean> {
  if (!isNative) return false;
  try {
    return !(await Network.getStatus()).connected;
  } catch {
    return false;
  }
}

export async function enqueueJournalWrite(payload: Record<string, unknown> & { clientId: string }) {
  if (!enabled()) throw new Error("You're offline. Please try again when you're connected.");
  const queue = (await readEncrypted<QueuedJournal[]>(QUEUE_KEY)) ?? [];
  const queuedAt = new Date().toISOString();
  if (!queue.some((q) => q.clientId === payload.clientId)) {
    queue.push({ clientId: payload.clientId, payload, queuedAt });
    await writeEncrypted(QUEUE_KEY, queue);
  }
  // Optimistic entry for the list (negative id = not yet synced).
  return {
    id: -Date.now(),
    userId: "",
    content: String(payload.content ?? ""),
    mood: (payload.mood as string) ?? null,
    manifestationFocus: (payload.manifestationFocus as string) ?? null,
    clientId: payload.clientId,
    createdAt: queuedAt as unknown as Date,
    queuedOffline: true,
  } as any;
}

export async function pendingJournalCount(): Promise<number> {
  if (!enabled()) return 0;
  return ((await readEncrypted<QueuedJournal[]>(QUEUE_KEY)) ?? []).length;
}

let flushing = false;
/** Replays queued journal writes. The server dedupes by (user, clientId), so retries are safe. */
export async function flushJournalQueue(qc: QueryClient): Promise<number> {
  if (!enabled() || flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    let queue = (await readEncrypted<QueuedJournal[]>(QUEUE_KEY)) ?? [];
    for (const item of [...queue]) {
      try {
        const res = await apiFetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item.payload, clientId: item.clientId }),
        });
        if (res.ok || res.status === 400) {
          // 400 = permanently invalid; drop it rather than retry forever.
          queue = queue.filter((q) => q.clientId !== item.clientId);
          await writeEncrypted(QUEUE_KEY, queue);
          if (res.ok) sent++;
        } else {
          break; // auth/server problem: try again later
        }
      } catch {
        break; // still offline
      }
    }
    if (sent) await qc.invalidateQueries({ queryKey: ["/api/journal"] });
  } finally {
    flushing = false;
  }
  return sent;
}

/** Removes every on-device copy of user data (sign out and account deletion). */
export async function clearOfflineData(): Promise<void> {
  if (!isNative) return;
  await Preferences.remove({ key: CACHE_KEY });
  await Preferences.remove({ key: QUEUE_KEY });
  await secureRemove(KEY_NAME);
  keyPromise = null;
}
