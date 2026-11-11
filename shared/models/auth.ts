import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider").default("replit"),
  // Admin-only features (Training dashboard, AgentForge agent/training/behavioral-search routes).
  // Never settable through the API; flip it in the database for trusted operators only.
  isAdmin: boolean("is_admin").notNull().default(false),
  // Sign in with Apple: stable Apple user identifier ("sub" claim) and the Apple refresh token
  // (only stored when Apple client credentials are configured; used to revoke on account deletion).
  appleSub: varchar("apple_sub").unique(),
  appleRefreshToken: text("apple_refresh_token"),
  // One-time consent that AI features send content to OpenAI (Guideline 5.1.2).
  aiConsentAt: timestamp("ai_consent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bearer-token refresh tokens for the native app (cookie sessions remain for the web).
// Only a SHA-256 hash of the opaque token is stored. Tokens rotate on every use; presenting an
// already-used token revokes the whole family (reuse detection).
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    tokenHash: varchar("token_hash").notNull().unique(),
    familyId: varchar("family_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_refresh_tokens_user").on(table.userId), index("IDX_refresh_tokens_family").on(table.familyId)]
);

export type RefreshToken = typeof refreshTokens.$inferSelect;

/** User shape safe to send to clients (no password hash, no Apple token). */
export type PublicUser = Omit<User, "passwordHash" | "appleRefreshToken">;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type RegisterRequest = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};
