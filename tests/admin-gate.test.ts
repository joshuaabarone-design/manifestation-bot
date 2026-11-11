import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());
// No network: AgentForge is replaced with stubs so admin requests can succeed offline.
const STUB = vi.hoisted(() => ({ id: 22, name: "stub", role: "coach", description: "stub agent", capabilities: ["a"] }));
vi.mock("../server/agentforge", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    getAllAgents: vi.fn(async () => ({ manifestation: STUB })),
    getAgentConfigById: vi.fn(async () => STUB),
    getAgentConfig: vi.fn(async () => STUB),
    refreshAgentConfig: vi.fn(async () => STUB),
    behavioralSearch: vi.fn(async () => ({ results: [] })),
    getAgentSystemPrompt: vi.fn(async () => "stub prompt"),
  };
});

import { buildApp, createUser } from "./helpers/app";
import { db } from "../server/db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { app = await buildApp(); });

const ADMIN_ROUTES: Array<[method: "get" | "post", path: string]> = [
  ["post", "/api/agent-config/refresh"],
  ["get", "/api/agents"],
  ["get", "/api/agents/22"],
  ["post", "/api/agents/refresh-all"],
  ["post", "/api/behavioral-search"],
  ["post", "/api/training/test"],
  ["post", "/api/training/suite"],
  ["post", "/api/training/recommendations"],
  ["get", "/api/admin/ai-reports"],
  ["get", "/api/conversations"],
  ["post", "/api/generate-image"],
];

describe("admin gate (users.is_admin)", () => {
  it("new users are not admins by default", async () => {
    const { user } = await createUser();
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.isAdmin).toBe(false);
  });

  it.each(ADMIN_ROUTES)("%s %s returns 404 for a signed-in consumer", async (method, path) => {
    const { auth } = await createUser();
    const res = await request(app)[method](path).set(auth).send({});
    expect(res.status).toBe(404);
  });

  it.each(ADMIN_ROUTES)("%s %s returns 401 when signed out", async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it("admins reach the agent, training-report and moderation routes", async () => {
    const { auth } = await createUser({ isAdmin: true });
    expect((await request(app).get("/api/agents").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/agents/22").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/admin/ai-reports").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/conversations").set(auth)).status).toBe(200);
  });

  it("the consumer-facing agent config stays available to signed-in users", async () => {
    const { auth } = await createUser();
    expect((await request(app).get("/api/agent-config").set(auth)).status).toBe(200);
  });

  it("is_admin cannot be set through the API", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("X-Auth-Mode", "token")
      .send({ email: "sneaky@example.test", password: "password-123", isAdmin: true, is_admin: true });
    expect(res.status).toBe(201);
    expect(res.body.isAdmin).toBe(false);
    const agents = await request(app).get("/api/agents").set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(agents.status).toBe(404);
  });
});
