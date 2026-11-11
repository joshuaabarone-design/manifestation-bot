import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { getTableColumns, getTableName, is, eq, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());
const appleMock = vi.hoisted(() => ({ revoke: vi.fn(async () => true) }));
vi.mock("../server/auth/apple", async (orig) => ({ ...(await orig<any>()), revokeAppleToken: appleMock.revoke }));

import { buildApp, createUser } from "./helpers/app";
import { db } from "../server/db";
import * as schema from "@shared/schema";
import { deleteAccount, USER_SCOPED_TABLES, PARENT_SCOPED_TABLES } from "../server/account";

const {
  users, sessions, refreshTokens, goals, affirmations, journalEntries, visionBoards, visionBoardImages,
  reminderSettings, chatConversations, chatMessages, userStreaks, dailyRituals, ritualCompletions, aiReports,
} = schema as any;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { app = await buildApp(); });
beforeEach(() => appleMock.revoke.mockClear());

/** Put at least one row in every user-owned table (and child table) for this user. */
async function seed(userId: string) {
  await db.insert(goals).values({ userId, title: "Run a marathon" });
  await db.insert(affirmations).values({ userId, content: "I am capable" });
  await db.insert(journalEntries).values({ userId, content: "Grateful today", clientId: `c-${userId}` });
  const [board] = await db.insert(visionBoards).values({ userId, title: "2027" }).returning();
  await db.insert(visionBoardImages).values({ visionBoardId: board.id, imageUrl: "https://example.test/a.png" });
  await db.insert(reminderSettings).values({ userId, phoneNumber: "+15555550100" });
  const [conv] = await db.insert(chatConversations).values({ userId, title: "Coach" }).returning();
  await db.insert(chatMessages).values({ conversationId: conv.id, role: "user", content: "hi" });
  await db.insert(userStreaks).values({ userId });
  const [ritual] = await db.insert(dailyRituals).values({ userId, type: "morning", name: "Gratitude" }).returning();
  await db.insert(ritualCompletions).values({ userId, ritualId: ritual.id });
  await db.insert(aiReports).values({ userId, feature: "advice", content: "x", reason: "other" });
  await db.insert(sessions).values({
    sid: `sid-${userId}`,
    sess: { cookie: {}, passport: { user: { claims: { sub: userId } } } },
    expire: new Date(Date.now() + 86_400_000),
  });
  return { boardId: board.id, convId: conv.id };
}

async function countFor(userId: string) {
  const counts: Record<string, number> = {};
  for (const [name, t] of Object.entries(USER_SCOPED_TABLES) as any) {
    counts[name] = (await db.select().from(t).where(eq(t.userId, userId))).length;
  }
  counts.users = (await db.select().from(users).where(eq(users.id, userId))).length;
  counts.sessions = (await db.select().from(sessions)
    .where(sql`${sessions.sess} -> 'passport' -> 'user' -> 'claims' ->> 'sub' = ${userId}`)).length;
  return counts;
}

describe("account deletion (DELETE /api/account)", () => {
  it("every schema table with a user_id column is covered by the deletion code", () => {
    const covered = new Set(Object.values(USER_SCOPED_TABLES).map((t: any) => getTableName(t)));
    const parentScoped = new Set(Object.values(PARENT_SCOPED_TABLES).map((t: any) => getTableName(t)));
    for (const value of Object.values(schema)) {
      if (!is(value as any, PgTable)) continue;
      const name = getTableName(value as any);
      const cols = Object.values(getTableColumns(value as any)).map((c: any) => c.name);
      if (cols.includes("user_id")) expect(covered, `table ${name} has user_id but is not deleted`).toContain(name);
      if (cols.includes("vision_board_id") || name === "chat_messages") expect(parentScoped).toContain(name);
    }
  });

  it("hard-deletes every row for the user and leaves other users untouched", async () => {
    const victim = await createUser();
    const bystander = await createUser();
    const v = await seed(victim.user.id);
    const b = await seed(bystander.user.id);

    const before = await countFor(victim.user.id);
    for (const [name, n] of Object.entries(before)) expect(n, `seeded ${name}`).toBeGreaterThan(0);

    const res = await request(app).delete("/api/account").set(victim.auth);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    expect(res.body.appleRevoked).toBeNull(); // not a Sign in with Apple user

    const after = await countFor(victim.user.id);
    for (const [name, n] of Object.entries(after)) expect(n, `remaining ${name}`).toBe(0);
    expect((await db.select().from(visionBoardImages).where(eq(visionBoardImages.visionBoardId, v.boardId))).length).toBe(0);
    expect((await db.select().from(chatMessages).where(eq(chatMessages.conversationId, v.convId))).length).toBe(0);

    // Bystander keeps everything.
    const other = await countFor(bystander.user.id);
    for (const [name, n] of Object.entries(other)) expect(n, `bystander ${name}`).toBeGreaterThan(0);
    expect((await db.select().from(visionBoardImages).where(eq(visionBoardImages.visionBoardId, b.boardId))).length).toBe(1);
    expect((await db.select().from(chatMessages).where(eq(chatMessages.conversationId, b.convId))).length).toBe(1);
  });

  it("refresh and access tokens stop working after deletion", async () => {
    const u = await createUser();
    await request(app).delete("/api/account").set(u.auth).expect(200);
    expect((await request(app).get("/api/goals").set(u.auth)).status).toBe(401);
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: u.tokens.refreshToken });
    expect(res.status).toBe(401);
  });

  it("revokes the Sign in with Apple token when one is stored", async () => {
    const u = await createUser({ appleSub: "apple-del-1", appleRefreshToken: "apple-refresh-token-value" });
    const res = await request(app).delete("/api/account").set(u.auth);
    expect(res.status).toBe(200);
    expect(appleMock.revoke).toHaveBeenCalledWith("apple-refresh-token-value");
    expect(res.body.appleRevoked).toBe(true);
  });

  it("still deletes the data if Apple revocation fails", async () => {
    appleMock.revoke.mockRejectedValueOnce(new Error("network"));
    const u = await createUser({ appleSub: "apple-del-2", appleRefreshToken: "rt-2" });
    const result = await deleteAccount(u.user.id);
    expect(result.appleRevoked).toBe(false);
    expect((await db.select().from(users).where(eq(users.id, u.user.id))).length).toBe(0);
  });

  it("requires authentication", async () => {
    expect((await request(app).delete("/api/account")).status).toBe(401);
  });
});
