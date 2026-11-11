import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWK } from "jose";

// Mocked Apple JWKS: createRemoteJWKSet (used for https://appleid.apple.com/auth/keys) is replaced
// with a local key set, so no network call is made and the real verification code path runs.
const jwksHolder = vi.hoisted(() => ({ getKey: null as any }));
vi.mock("jose", async (orig) => {
  const real: any = await orig();
  return { ...real, createRemoteJWKSet: () => (h: any, t: any) => jwksHolder.getKey(h, t) };
});
vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());

import { buildApp } from "./helpers/app";
import { verifyAppleIdentityToken, sha256Hex, AppleVerificationError, APPLE_ISSUER } from "../server/auth/apple";

const BUNDLE_ID = "com.joshuabarone.manifestation";
process.env.APPLE_BUNDLE_ID = BUNDLE_ID;

let appleKey: CryptoKey;
let attackerKey: CryptoKey;
let app: Awaited<ReturnType<typeof buildApp>>;

async function appleToken(claims: Record<string, unknown>, opts: { key?: CryptoKey; kid?: string; iss?: string; aud?: string; iat?: number; exp?: number; alg?: string } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "apple-test-kid" })
    .setIssuer(opts.iss ?? APPLE_ISSUER)
    .setAudience(opts.aud ?? BUNDLE_ID)
    .setSubject((claims.sub as string) ?? "001234.apple-user.0001")
    .setIssuedAt(opts.iat ?? now)
    .setExpirationTime(opts.exp ?? now + 600)
    .sign(opts.key ?? appleKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  appleKey = pair.privateKey as CryptoKey;
  attackerKey = (await generateKeyPair("RS256")).privateKey as CryptoKey;
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "apple-test-kid", alg: "RS256", use: "sig" };
  jwksHolder.getKey = createLocalJWKSet({ keys: [jwk] });
  app = await buildApp();
});

describe("Sign in with Apple identity-token verification", () => {
  const nonce = "raw-nonce-1234567890";

  it("accepts a valid token with the right issuer, audience and hashed nonce", async () => {
    const t = await appleToken({ sub: "apple-sub-1", email: "a@privaterelay.appleid.com", email_verified: "true", is_private_email: "true", nonce: sha256Hex(nonce) });
    const id = await verifyAppleIdentityToken(t, { rawNonce: nonce });
    expect(id.sub).toBe("apple-sub-1");
    expect(id.emailVerified).toBe(true);
    expect(id.isPrivateEmail).toBe(true);
    expect(id.audience).toBe(BUNDLE_ID);
  });

  it.each([
    ["wrong nonce", async () => appleToken({ sub: "x", nonce: sha256Hex("other-nonce") })],
    ["missing nonce", async () => appleToken({ sub: "x" })],
    ["wrong audience", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { aud: "com.someone.else" })],
    ["wrong issuer", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { iss: "https://evil.example" })],
    ["expired", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 })],
    ["too old (iat > 10 min)", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { iat: Math.floor(Date.now() / 1000) - 3600, exp: Math.floor(Date.now() / 1000) + 3600 })],
    ["signed by a key not in Apple's JWKS", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { key: attackerKey })],
    ["unknown kid", async () => appleToken({ sub: "x", nonce: sha256Hex(nonce) }, { kid: "nope" })],
  ])("rejects a token with %s", async (_label, make) => {
    await expect(verifyAppleIdentityToken(await make(), { rawNonce: nonce })).rejects.toBeInstanceOf(AppleVerificationError);
  });

  it("rejects an HS256 token (algorithm pinned to RS256)", async () => {
    const t = await new SignJWT({ nonce: sha256Hex(nonce) })
      .setProtectedHeader({ alg: "HS256", kid: "apple-test-kid" })
      .setIssuer(APPLE_ISSUER).setAudience(BUNDLE_ID).setSubject("x").setIssuedAt().setExpirationTime("5m")
      .sign(new TextEncoder().encode("0123456789abcdef0123456789abcdef"));
    await expect(verifyAppleIdentityToken(t, { rawNonce: nonce })).rejects.toBeInstanceOf(AppleVerificationError);
  });

  it("requires a nonce (no replay of tokens minted without one)", async () => {
    const t = await appleToken({ sub: "x", nonce: sha256Hex(nonce) });
    await expect(verifyAppleIdentityToken(t)).rejects.toThrow(/nonce/);
  });

  it("refuses when Sign in with Apple is not configured", async () => {
    const t = await appleToken({ sub: "x", nonce: sha256Hex(nonce) });
    await expect(verifyAppleIdentityToken(t, { rawNonce: nonce, audiences: [] })).rejects.toThrow(/not configured/);
  });

  it("POST /api/auth/apple signs in, creates the user once, and returns tokens", async () => {
    const make = async () => appleToken({ sub: "apple-sub-route", email: "route@privaterelay.appleid.com", email_verified: true, nonce: sha256Hex(nonce) });
    const first = await request(app).post("/api/auth/apple").set("X-Auth-Mode", "token")
      .send({ identityToken: await make(), rawNonce: nonce, givenName: "Ada", familyName: "L" });
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toBeTypeOf("string");
    expect(first.body.appleSub).toBe("apple-sub-route");
    expect(first.body.firstName).toBe("Ada");
    expect(first.body).not.toHaveProperty("appleRefreshToken");

    const second = await request(app).post("/api/auth/apple").set("X-Auth-Mode", "token")
      .send({ identityToken: await make(), rawNonce: nonce });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it("POST /api/auth/apple returns 401 for a bad token", async () => {
    const bad = await appleToken({ sub: "x", nonce: sha256Hex("wrong") });
    const res = await request(app).post("/api/auth/apple").set("X-Auth-Mode", "token").send({ identityToken: bad, rawNonce: nonce });
    expect(res.status).toBe(401);
  });
});
