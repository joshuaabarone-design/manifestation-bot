// Sign in with Apple (Guideline 4.8): server-side identity-token verification and token revocation.
// Identity tokens are verified against Apple's JWKS (RS256), issuer, audience (bundle ID and/or
// Services ID) and the SHA-256 of the client-generated nonce.
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8, type JWTVerifyGetKey } from "jose";
import { createHash } from "crypto";

export const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const MAX_TOKEN_AGE_SECONDS = 10 * 60;

let remoteJwks: JWTVerifyGetKey | null = null;
function defaultJwks(): JWTVerifyGetKey {
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(APPLE_JWKS_URL);
  return remoteJwks;
}

/** Accepted audiences: APPLE_BUNDLE_ID (native) plus optional APPLE_SERVICES_ID (web). */
export function appleAudiences(): string[] {
  return [process.env.APPLE_BUNDLE_ID, process.env.APPLE_SERVICES_ID]
    .flatMap((v) => (v ? v.split(",") : []))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface AppleIdentity {
  sub: string;
  email?: string;
  emailVerified: boolean;
  isPrivateEmail: boolean;
  audience: string;
}

export interface VerifyAppleOptions {
  audiences?: string[];
  /** Raw nonce the client generated; the token must carry sha256(rawNonce). */
  rawNonce?: string;
  jwks?: JWTVerifyGetKey;
  now?: Date;
}

export class AppleVerificationError extends Error {}

export async function verifyAppleIdentityToken(identityToken: string, opts: VerifyAppleOptions = {}): Promise<AppleIdentity> {
  const audiences = opts.audiences ?? appleAudiences();
  if (audiences.length === 0) {
    throw new AppleVerificationError("Sign in with Apple is not configured (APPLE_BUNDLE_ID)");
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(identityToken, opts.jwks ?? defaultJwks(), {
      issuer: APPLE_ISSUER,
      audience: audiences,
      algorithms: ["RS256"],
      maxTokenAge: MAX_TOKEN_AGE_SECONDS,
      currentDate: opts.now,
    }));
  } catch (err: any) {
    throw new AppleVerificationError(`Invalid Apple identity token: ${err?.code || err?.message || "verify failed"}`);
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new AppleVerificationError("Apple identity token has no subject");
  }
  // Nonce binds the token to this sign-in attempt (replay protection). Always required.
  if (!opts.rawNonce) {
    throw new AppleVerificationError("Apple sign-in requires a nonce");
  }
  if (typeof payload.nonce !== "string" || payload.nonce !== sha256Hex(opts.rawNonce)) {
    throw new AppleVerificationError("Apple identity token nonce mismatch");
  }
  const asBool = (v: unknown) => v === true || v === "true";
  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: asBool(payload.email_verified),
    isPrivateEmail: asBool(payload.is_private_email),
    audience: Array.isArray(payload.aud) ? payload.aud[0] : String(payload.aud),
  };
}

// ---- Client secret + code exchange + revocation (needs the owner's Apple key) ----

export function appleCredentialsConfigured(): boolean {
  return !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY && process.env.APPLE_BUNDLE_ID);
}

async function clientSecret(clientId: string): Promise<string> {
  const pem = (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_TEAM_ID!)
    .setSubject(clientId)
    .setAudience(APPLE_ISSUER)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

/** Exchange the one-time authorization code for an Apple refresh token (needed for revocation). */
export async function exchangeAppleAuthorizationCode(code: string, clientId = process.env.APPLE_BUNDLE_ID!): Promise<string | null> {
  if (!appleCredentialsConfigured()) return null;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: await clientSecret(clientId),
    code,
    grant_type: "authorization_code",
  });
  const res = await fetch(`${APPLE_ISSUER}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[apple] code exchange failed:", res.status);
    return null;
  }
  const json = (await res.json()) as { refresh_token?: string };
  return json.refresh_token ?? null;
}

/** Revoke the user's Apple tokens (Apple's account-deletion requirement for SIWA apps). */
export async function revokeAppleToken(refreshToken: string, clientId = process.env.APPLE_BUNDLE_ID!): Promise<boolean> {
  if (!appleCredentialsConfigured()) return false;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: await clientSecret(clientId),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  const res = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) console.error("[apple] revoke failed:", res.status);
  return res.ok;
}
