// Builds the real Express app (real routes + auth middleware) for supertest.
// Test files must vi.mock("../server/db") and vi.mock("connect-pg-simple") before importing this.
import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { registerRoutes } from "../../server/routes";
import { db } from "../../server/db";
import { users } from "@shared/models/auth";
import { issueTokenPair } from "../../server/auth/tokens";

export async function buildApp() {
  const app = express();
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  return app;
}

export async function createUser(opts: { isAdmin?: boolean; email?: string; appleSub?: string; appleRefreshToken?: string } = {}) {
  const id = randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      id,
      email: opts.email ?? `${id}@example.test`,
      firstName: "Test",
      isAdmin: opts.isAdmin ?? false,
      appleSub: opts.appleSub,
      appleRefreshToken: opts.appleRefreshToken,
    } as any)
    .returning();
  const tokens = await issueTokenPair(user);
  return { user, tokens, auth: { Authorization: `Bearer ${tokens.accessToken}` } };
}
