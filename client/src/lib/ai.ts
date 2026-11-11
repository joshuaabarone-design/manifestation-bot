import { apiFetch, apiJson } from "./api";
import { queryClient } from "./queryClient";

export interface CrisisResource {
  name: string;
  contact: string;
  url?: string;
}

/** Shown locally if the server did not include resources (e.g. offline). */
export const DEFAULT_CRISIS_RESOURCES: CrisisResource[] = [
  { name: "988 Suicide & Crisis Lifeline (U.S.)", contact: "Call or text 988", url: "https://988lifeline.org" },
  { name: "Crisis Text Line (U.S./UK/CA/IE)", contact: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  { name: "Find a helpline (international)", contact: "findahelpline.com", url: "https://findahelpline.com" },
];

// ---- One-time AI consent (Guideline 5.1.2) ----

type ConsentOpener = () => Promise<boolean>;
let opener: ConsentOpener | null = null;

export function registerConsentOpener(fn: ConsentOpener | null) {
  opener = fn;
}

function hasConsentCached(): boolean {
  const user = queryClient.getQueryData<{ aiConsentAt?: string | null } | null>(["/api/auth/user"]);
  return !!user?.aiConsentAt;
}

export async function grantAiConsent(granted = true): Promise<void> {
  await apiJson("POST", "/api/ai/consent", { granted });
  queryClient.setQueryData<any>(["/api/auth/user"], (u: any) =>
    u ? { ...u, aiConsentAt: granted ? new Date().toISOString() : null } : u,
  );
}

export class AiConsentDeclinedError extends Error {
  constructor() {
    super("AI features stay off until you agree to how your content is shared with OpenAI.");
  }
}

/** Call before every AI request. Resolves once the user has agreed (asks once, then remembers). */
export async function ensureAiConsent(): Promise<void> {
  if (hasConsentCached()) return;
  if (!opener) throw new AiConsentDeclinedError();
  const ok = await opener();
  if (!ok) throw new AiConsentDeclinedError();
}

// ---- Crisis resources ----

export function announceCrisis(resources?: CrisisResource[]) {
  window.dispatchEvent(new CustomEvent("ai-crisis", { detail: resources ?? DEFAULT_CRISIS_RESOURCES }));
}

/** POST an AI request with consent + crisis handling; returns the JSON body. */
export async function aiPost<T extends Record<string, any>>(path: string, body: unknown, fallbackError: string): Promise<T> {
  await ensureAiConsent();
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 403 && json?.code === "AI_CONSENT_REQUIRED") {
    // Server and client disagree (e.g. consent withdrawn on another device): ask again once.
    queryClient.setQueryData<any>(["/api/auth/user"], (u: any) => (u ? { ...u, aiConsentAt: null } : u));
    await ensureAiConsent();
    return aiPost<T>(path, body, fallbackError);
  }
  if (!res.ok) throw new Error(json?.message || fallbackError);
  if (json?.crisis) announceCrisis(json.resources);
  return json as T;
}

// ---- Report this response (Guideline 1.2) ----

export type AiFeature = "advice" | "affirmation" | "image" | "chat";
export type ReportReason = "harmful" | "inaccurate" | "offensive" | "other";

export async function reportAiResponse(input: {
  feature: AiFeature;
  reason: ReportReason;
  content: string;
  details?: string;
}): Promise<void> {
  await apiJson("POST", "/api/ai/reports", input);
}
