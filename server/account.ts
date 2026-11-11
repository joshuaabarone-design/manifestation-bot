// In-app account deletion (Guideline 5.1.1(v)): hard-deletes every row owned by the user, in one
// transaction, children before parents. USER_SCOPED_TABLES is checked by a test against the schema
// so a new user-owned table cannot be forgotten silently.
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, sessions, refreshTokens,
  goals, affirmations, journalEntries, visionBoards, visionBoardImages, reminderSettings,
  chatConversations, chatMessages, userStreaks, dailyRituals, ritualCompletions, aiReports,
} from "@shared/schema";
import { revokeAppleToken } from "./auth/apple";

/** Tables with a user_id column, deleted directly by user id. */
export const USER_SCOPED_TABLES = {
  ritualCompletions, dailyRituals, goals, affirmations, journalEntries, visionBoards,
  reminderSettings, chatConversations, userStreaks, aiReports, refreshTokens,
} as const;

/** Tables owned through a parent (no user_id column). */
export const PARENT_SCOPED_TABLES = { visionBoardImages, chatMessages } as const;

export interface DeletionResult {
  deleted: Record<string, number>;
  appleRevoked: boolean | null; // null = not a SIWA user or Apple credentials not configured
}

export async function deleteAccount(userId: string): Promise<DeletionResult> {
  const deleted: Record<string, number> = {};
  let appleRefreshToken: string | null = null;

  await db.transaction(async (tx) => {
    const [user] = await tx.select({ appleRefreshToken: users.appleRefreshToken }).from(users).where(eq(users.id, userId));
    appleRefreshToken = user?.appleRefreshToken ?? null;

    const boardIds = (await tx.select({ id: visionBoards.id }).from(visionBoards).where(eq(visionBoards.userId, userId))).map((r) => r.id);
    const convIds = (await tx.select({ id: chatConversations.id }).from(chatConversations).where(eq(chatConversations.userId, userId))).map((r) => r.id);

    deleted.visionBoardImages = boardIds.length
      ? (await tx.delete(visionBoardImages).where(inArray(visionBoardImages.visionBoardId, boardIds)).returning({ id: visionBoardImages.id })).length
      : 0;
    deleted.chatMessages = convIds.length
      ? (await tx.delete(chatMessages).where(inArray(chatMessages.conversationId, convIds)).returning({ id: chatMessages.id })).length
      : 0;

    for (const [name, table] of Object.entries(USER_SCOPED_TABLES)) {
      const t = table as any;
      deleted[name] = (await tx.delete(t).where(eq(t.userId, userId)).returning({ id: t.id })).length;
    }

    // Web cookie sessions (connect-pg-simple) store the passport user inside the JSON blob.
    deleted.sessions = (
      await tx
        .delete(sessions)
        .where(sql`${sessions.sess} -> 'passport' -> 'user' -> 'claims' ->> 'sub' = ${userId}`)
        .returning({ sid: sessions.sid })
    ).length;

    deleted.users = (await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id })).length;
  });

  // Revoke Sign in with Apple after the data is gone; failure is logged, not fatal.
  let appleRevoked: boolean | null = null;
  if (appleRefreshToken) {
    try {
      appleRevoked = await revokeAppleToken(appleRefreshToken);
    } catch (err) {
      console.error("[account] Apple token revocation error");
      appleRevoked = false;
    }
  }
  return { deleted, appleRevoked };
}
