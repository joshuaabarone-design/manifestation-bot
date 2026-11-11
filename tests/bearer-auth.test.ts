import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { SignJWT } from "jose";

vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());

import { buildApp, createUser } from "./helpers/app";
import { verifyAccessToken, rotateRefreshToken, signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "../server/auth/tokens";
import { authStorage } from "../server/replit_integrations/auth";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { app = await buildApp(); });

describe("bearer-token auth (iOS)", () => {
  it("register with X-Auth-Mode: token returns a token pair and no secrets", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("X-Auth-Mode", "token")
      .send({ email: "bearer-reg@example.test", password: "correct horse battery" });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).toBeTypeOf("string");
    expect(res.body.tokenType).toBe("Bearer");
    expect(res.body.expiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("appleRefreshToken");
    expect(res.headers["set-cookie"]).toBeUndefined();

    const me = await request(app).get("/api/auth/user").set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("bearer-reg@example.test");
    expect(me.body).not.toHaveProperty("passwordHash");
  });

  it("login without the header keeps the web cookie session path (no tokens)", async () => {
    await request(app).post("/api/auth/register").send({ email: "web@example.test", password: "password-web-1" });
    const res = await request(app).post("/api/auth/login").set("X-Forwarded-Proto", "https").send({ email: "web@example.test", password: "password-web-1" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeUndefined();
    expect(String(res.headers["set-cookie"] ?? "")).toContain("connect.sid");
  });

  it("protected routes accept a valid bearer token and reject missing, forged, or expired tokens", async () => {
    const { auth, user } = await createUser();
    expect((await request(app).get("/api/goals").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/goals")).status).toBe(401);
    expect((await request(app).get("/api/goals").set("Authorization", "Bearer not-a-jwt")).status).toBe(401);

    const forged = await new SignJWT({ typ: "access" })
      .setProtectedHeader({ alg: "HS256" }).setSubject(user.id)
      .setIssuer("manifestation-api").setAudience("manifestation-app").setExpirationTime("10m")
      .sign(new TextEncoder().encode("a-different-secret-that-is-long-enough-000"));
    expect((await request(app).get("/api/goals").set("Authorization", `Bearer ${forged}`)).status).toBe(401);

    const expired = await new SignJWT({ typ: "access" })
      .setProtectedHeader({ alg: "HS256" }).setSubject(user.id)
      .setIssuer("manifestation-api").setAudience("manifestation-app")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600).setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    expect((await request(app).get("/api/goals").set("Authorization", `Bearer ${expired}`)).status).toBe(401);
  });

  it("access tokens are pinned to HS256 and typ=access", async () => {
    const { user } = await createUser();
    const token = await signAccessToken(user);
    const claims = await verifyAccessToken(token);
    expect(claims.sub).toBe(user.id);
    const unsigned = token.split(".").slice(0, 2).join(".") + ".";
    await expect(verifyAccessToken(unsigned)).rejects.toThrow();
  });

  it("refresh rotates the token; reusing an old one revokes the whole family", async () => {
    const { tokens } = await createUser();
    const r1 = await request(app).post("/api/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).not.toBe(tokens.refreshToken);

    // Replay of the first (already used) token: rejected and family revoked.
    const replay = await request(app).post("/api/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);
    // The legitimately rotated token is now revoked too.
    const r2 = await request(app).post("/api/auth/refresh").send({ refreshToken: r1.body.refreshToken });
    expect(r2.status).toBe(401);
  });

  it("logout with a refresh token revokes it", async () => {
    const { tokens } = await createUser();
    await request(app).post("/api/auth/logout").send({ refreshToken: tokens.refreshToken });
    await expect(rotateRefreshToken(tokens.refreshToken, (id) => authStorage.getUser(id))).rejects.toThrow();
  });

  it("users cannot read another user's data by id (IDOR)", async () => {
    const a = await createUser();
    const b = await createUser();
    const created = await request(app).post("/api/vision-boards").set(a.auth).send({ title: "A's board" });
    expect(created.status).toBe(201);
    const res = await request(app).get(`/api/vision-boards/${created.body.id}`).set(b.auth);
    expect(res.status).toBe(404);
  });
});
