import { Capacitor } from "@capacitor/core";

/** True inside the Capacitor iOS shell (capacitor://localhost), false on the web. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "ios" | "android" | "web"

/**
 * Base URL of the hosted API. Empty on the web (same origin). Required for iOS builds, where
 * the bundled assets are served from capacitor://localhost and every request must go to the API host.
 */
export const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

if (isNative && !API_BASE) {
  console.warn("VITE_API_BASE_URL is not set; the iOS app cannot reach the API.");
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
