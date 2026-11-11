import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { eq } from "drizzle-orm";

vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());

import { buildApp, createUser } from "./helpers/app";
import { db } from "../server/db";
import { aiReports, reminderSettings } from "@shared/schema";
import { setModerationClient, localSelfHarmCheck } from "../server/ai-safety";
import { classifyKeyword } from "../server/sms";

let app: express.Express;
beforeAll(async () => {
  delete process.env.TWILIO_AUTH_TOKEN;
  const inner = await buildApp();
  app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(inner);
});

const moderation = { flagged: false, categories: {} as Record<string, boolean> };
beforeEach(() => {
  moderation.flagged = false;
  moderation.categories = {};
  setModerationClient({ moderations: { create: vi.fn(async () => ({ results: [moderation] })) } } as any);
});

describe("AI safety", () => {
  it("AI routes require one-time consent", async () => {
    const { auth } = await createUser();
    const res = await request(app).post("/api/affirmations/generate").set(auth).send({ theme: "career" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("AI_CONSENT_REQUIRED");
    await request(app).post("/api/ai/consent").set(auth).send({ granted: true }).expect(200);
    expect((await request(app).get("/api/ai/consent").set(auth)).body.consented).toBe(true);
  });

  it("self-harm input returns crisis resources and never reaches the model", async () => {
    const { auth } = await createUser();
    await request(app).post("/api/ai/consent").set(auth).send({ granted: true });
    const res = await request(app).post("/api/affirmations/generate").set(auth).send({ theme: "I want to kill myself" });
    expect(res.status).toBe(200);
    expect(res.body.crisis).toBe(true);
    expect(JSON.stringify(res.body.resources)).toMatch(/988/);
  });

  it("flagged input is blocked", async () => {
    moderation.flagged = true;
    moderation.categories = { harassment: true };
    const { auth } = await createUser();
    await request(app).post("/api/ai/consent").set(auth).send({ granted: true });
    const res = await request(app).post("/api/affirmations/generate").set(auth).send({ theme: "something hateful" });
    expect(res.status).toBe(400);
    expect(res.body.moderated).toBe(true);
  });

  it("moderation outage fails closed by default", async () => {
    setModerationClient({ moderations: { create: vi.fn(async () => { throw new Error("down"); }) } } as any);
    const { auth } = await createUser();
    await request(app).post("/api/ai/consent").set(auth).send({ granted: true });
    const res = await request(app).post("/api/affirmations/generate").set(auth).send({ theme: "career" });
    expect(res.status).toBe(503);
  });

  it("local self-harm patterns catch common phrasings", () => {
    expect(localSelfHarmCheck("I want to end my life")).toBe(true);
    expect(localSelfHarmCheck("I don't want to wake up anymore")).toBe(true);
    expect(localSelfHarmCheck("I want to end my workday early")).toBe(false);
    expect(localSelfHarmCheck("I want to kill it at my interview")).toBe(false);
  });

  it("users can report an AI response; it is stored for admin review", async () => {
    const { auth, user } = await createUser();
    const res = await request(app).post("/api/ai/reports").set(auth)
      .send({ feature: "advice", content: "bad advice", reason: "harmful", details: "unsafe" });
    expect(res.status).toBe(201);
    const rows = await db.select().from(aiReports).where(eq(aiReports.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("open");
  });
});

describe("SMS consent and STOP handling", () => {
  it("classifies carrier keywords", () => {
    expect(classifyKeyword(" stop ")).toBe("stop");
    expect(classifyKeyword("Unsubscribe")).toBe("stop");
    expect(classifyKeyword("START")).toBe("start");
    expect(classifyKeyword("help")).toBe("help");
    expect(classifyKeyword("thanks!")).toBeNull();
  });

  it("enabling SMS without consent is rejected, with consent it is recorded", async () => {
    const { auth, user } = await createUser();
    const noConsent = await request(app).put("/api/reminders/settings").set(auth)
      .send({ isEnabled: true, phoneNumber: "+15555550123", reminderTime: "09:00", timezone: "America/New_York", deliveryMethod: "sms" });
    expect(noConsent.status).toBe(400);
    const ok = await request(app).put("/api/reminders/settings").set(auth)
      .send({ isEnabled: true, phoneNumber: "+15555550123", reminderTime: "09:00", timezone: "America/New_York", deliveryMethod: "sms", smsConsent: true });
    expect(ok.status).toBe(200);
    const [row] = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, user.id));
    expect(row.smsConsentAt).toBeTruthy();
    expect(row.smsConsentText).toMatch(/STOP/);
  });

  it("an inbound STOP opts the number out and START opts it back in", async () => {
    const { auth, user } = await createUser();
    await request(app).put("/api/reminders/settings").set(auth)
      .send({ isEnabled: true, phoneNumber: "+15555550199", reminderTime: "09:00", timezone: "America/New_York", deliveryMethod: "sms", smsConsent: true })
      .expect(200);
    const stop = await request(app).post("/api/sms/inbound").type("form").send({ From: "+15555550199", Body: "STOP" });
    expect(stop.status).toBe(200);
    expect(stop.text).toMatch(/unsubscribed/);
    let [row] = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, user.id));
    expect(row.smsOptedOutAt).toBeTruthy();
    await request(app).post("/api/sms/inbound").type("form").send({ From: "+15555550199", Body: "START" }).expect(200);
    [row] = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, user.id));
    expect(row.smsOptedOutAt).toBeNull();
  });
});
