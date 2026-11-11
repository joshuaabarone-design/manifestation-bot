import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { apiFetch, handleAuthResponse } from "./api";
import { isNative } from "./platform";

/** Services ID for Sign in with Apple on the web (optional; the button is hidden on the web without it). */
const WEB_SERVICES_ID = import.meta.env.VITE_APPLE_SERVICES_ID as string | undefined;
/** Native client id is the app's bundle ID (placeholder until the Apple Developer account exists). */
const NATIVE_CLIENT_ID = (import.meta.env.VITE_APPLE_BUNDLE_ID as string | undefined) || "com.joshuabarone.manifestation";

export const appleSignInAvailable = isNative || !!WEB_SERVICES_ID;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomString(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Runs the native (or Apple JS) Sign in with Apple sheet, then has the server verify the
 * identity token against Apple's public keys. Apple receives sha256(rawNonce); the server
 * checks that the token's nonce matches sha256 of the raw value we send it.
 */
export async function signInWithApple(): Promise<void> {
  const rawNonce = randomString();
  const result = await SignInWithApple.authorize({
    clientId: isNative ? NATIVE_CLIENT_ID : WEB_SERVICES_ID!,
    redirectURI: isNative ? "https://appleid.apple.com/auth/callback" : `${window.location.origin}/auth`,
    scopes: "email name",
    state: randomString(16),
    nonce: await sha256Hex(rawNonce),
  });
  const r = result.response;
  const res = await apiFetch("/api/auth/apple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identityToken: r.identityToken,
      authorizationCode: r.authorizationCode,
      rawNonce,
      givenName: r.givenName,
      familyName: r.familyName,
      clientId: isNative ? NATIVE_CLIENT_ID : WEB_SERVICES_ID,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || "Sign in with Apple failed");
  }
  await handleAuthResponse(res);
}
