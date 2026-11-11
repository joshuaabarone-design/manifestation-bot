// Bearer-token auth for the native iOS app (capacitor://localhost cannot rely on cross-site cookies).
// Access token: short-lived HS256 JWT signed with JWT_SECRET (alg pinned on verify).
// Refresh token: opaque 256-bit random value; only its SHA-256 is stored. Rotated on each use;
// presenting a used/revoked token revokes the whole family (refresh-token reuse detection).
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes, randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { refreshTokens } from "@shared/models/auth";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ISSUER = "manifestation-api";
const AUDIENCE = "manifestation-app";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET (>= 32 chars) must be set to issue bearer tokens");
  }
  return new TextEncoder().encode(secret);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AccessClaims {
  sub: string;
  email?: string | null;
}

export async function signAccessToken(user: { id: string; email?: string | null }): Promise<string> {
  return new SignJWT({ email: user.email ?? null, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims & { exp: number }> {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (payload.typ !== "access" || typeof payload.sub !== "string" || typeof payload.exp !== "number") {
    throw new Error("Invalid access token");
  }
  return { sub: payload.sub, email: (payload.email as string | null) ?? null, exp: payload.exp };
}

async function insertRefreshToken(userId: string, familyId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(refreshTokens).values({
    userId,
    familyId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
  return token;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export async function issueTokenPair(user: { id: string; email?: string | null }): Promise<TokenPair> {
  const refreshToken = await insertRefreshToken(user.id, randomUUID());
  return {
    accessToken: await signAccessToken(user),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export class RefreshError extends Error {}

/**
 * Exchange a refresh token for a new pair. The old token is marked used atomically
 * (UPDATE ... WHERE used_at IS NULL), so two concurrent refreshes cannot both succeed.
 */
export async function rotateRefreshToken(
  presented: string,
  loadUser: (id: string) => Promise<{ id: string; email?: string | null } | undefined>,
): Promise<TokenPair> {
  const tokenHash = hashToken(presented);
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  if (!row) throw new RefreshError("Unknown refresh token");

  if (row.usedAt || row.revokedAt) {
    // Reuse of a rotated token: assume theft, revoke the whole family.
    await revokeFamily(row.familyId);
    throw new RefreshError("Refresh token reuse detected");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    throw new RefreshError("Refresh token expired");
  }

  const claimed = await db
    .update(refreshTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.usedAt), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  if (claimed.length === 0) {
    await revokeFamily(row.familyId);
    throw new RefreshError("Refresh token reuse detected");
  }

  const user = await loadUser(row.userId);
  if (!user) throw new RefreshError("User no longer exists");

  const refreshToken = await insertRefreshToken(user.id, row.familyId);
  return {
    accessToken: await signAccessToken(user),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function revokeFamily(familyId: string): Promise<void> {
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.familyId, familyId));
}

export async function revokeRefreshToken(presented: string): Promise<void> {
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(presented)));
  if (row) await revokeFamily(row.familyId);
}

export function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** Clients opt into token responses with this header (the iOS app always sends it). */
export function wantsTokens(req: { get(name: string): string | undefined }): boolean {
  return (req.get("x-auth-mode") || "").toLowerCase() === "token";
}
