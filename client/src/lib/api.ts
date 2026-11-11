import { apiUrl, isNative } from "./platform";
import { secureGet, secureRemove, secureSet } from "./secure-store";

const ACCESS_KEY = "mb.accessToken";
const REFRESH_KEY = "mb.refreshToken";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

let accessToken: string | null = null;
let loaded = false;
let refreshing: Promise<boolean> | null = null;

async function loadTokens() {
  if (loaded || !isNative) return;
  accessToken = await secureGet(ACCESS_KEY);
  loaded = true;
}

export async function setTokens(pair: TokenPair): Promise<void> {
  if (!isNative) return;
  accessToken = pair.accessToken;
  loaded = true;
  await secureSet(ACCESS_KEY, pair.accessToken);
  await secureSet(REFRESH_KEY, pair.refreshToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  await secureRemove(ACCESS_KEY);
  await secureRemove(REFRESH_KEY);
}

/** Saves tokens if the auth response carried them (native sign-in), and returns the body. */
export async function handleAuthResponse<T extends Record<string, any>>(res: Response): Promise<T> {
  const body = (await res.json()) as T & Partial<TokenPair>;
  if (body.accessToken && body.refreshToken) {
    await setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
  }
  return body;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(apiUrl("/api/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Auth-Mode": "token" },
          body: JSON.stringify({ refreshToken }),
          credentials: "omit",
        });
        if (!res.ok) {
          if (res.status === 401) await clearTokens();
          return false;
        }
        await setTokens(await res.json());
        return true;
      } catch {
        return false; // offline: keep tokens, try again later
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/**
 * fetch() for every API call. On the web it sends cookies (unchanged behaviour). In the iOS app it
 * targets VITE_API_BASE_URL, sends the Keychain-held bearer token, and refreshes it once on a 401.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const build = (): RequestInit => {
    const headers = new Headers(init.headers);
    if (isNative) {
      headers.set("X-Auth-Mode", "token");
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return { ...init, headers, credentials: isNative ? "omit" : "include" };
  };

  await loadTokens();
  let res = await fetch(apiUrl(path), build());
  if (isNative && res.status === 401 && !path.startsWith("/api/auth/refresh")) {
    if (await refreshAccessToken()) {
      res = await fetch(apiUrl(path), build());
    }
  }
  if (res.status === 403) {
    const clone = res.clone();
    try {
      const body = await clone.json();
      if (body?.code === "AI_CONSENT_REQUIRED") {
        window.dispatchEvent(new CustomEvent("ai-consent-required"));
      }
    } catch {
      /* not JSON */
    }
  }
  return res;
}

export async function apiJson<T = unknown>(method: string, path: string, data?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers: data !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}
