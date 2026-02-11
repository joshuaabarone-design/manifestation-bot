import { db } from "./db";
import { 
  users, goals, affirmations, journalEntries, visionBoards, visionBoardImages, reminderSettings,
  chatConversations, chatMessages, userStreaks, dailyRituals, ritualCompletions,
  type User, type UpsertUser,
  type Goal, type InsertGoal, type UpdateGoalRequest,
  type Affirmation, type InsertAffirmation,
  type JournalEntry, type InsertJournalEntry,
  type VisionBoard, type InsertVisionBoard,
  type VisionBoardImage, type InsertVisionBoardImage,
  type ReminderSettings, type InsertReminderSettings, type UpdateReminderSettingsRequest,
  type ChatConversation, type InsertChatConversation, type ChatMessage, type InsertChatMessage,
  type UserStreaks, type DailyRitual, type InsertDailyRitual, type RitualCompletion
} from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Auth (Required by Replit Auth Integration)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Goals
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | null>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, updates: UpdateGoalRequest): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;

  // Affirmations
  getAffirmations(userId: string): Promise<Affirmation[]>;
  createAffirmation(affirmation: InsertAffirmation): Promise<Affirmation>;

  // Journal
  getJournalEntries(userId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;

  // Vision Boards
  getVisionBoards(userId: string): Promise<VisionBoard[]>;
  getVisionBoard(id: number): Promise<(VisionBoard & { images: VisionBoardImage[] }) | undefined>;
  createVisionBoard(board: InsertVisionBoard): Promise<VisionBoard>;
  addVisionBoardImage(image: InsertVisionBoardImage): Promise<VisionBoardImage>;

  // Reminder Settings
  getReminderSettings(userId: string): Promise<ReminderSettings | undefined>;
  getAllReminderSettings(): Promise<ReminderSettings[]>;
  upsertReminderSettings(userId: string, settings: UpdateReminderSettingsRequest): Promise<ReminderSettings>;
  updateReminderLastSent(userId: string): Promise<void>;

  // Chat Conversations
  getChatConversations(userId: string): Promise<ChatConversation[]>;
  getChatConversation(id: number): Promise<(ChatConversation & { messages: ChatMessage[] }) | undefined>;
  getChatMessagesPaginated(conversationId: number, limit?: number, offset?: number): Promise<{ messages: ChatMessage[]; total: number }>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateConversationTitle(id: number, title: string): Promise<ChatConversation>;
  deleteChatConversation(id: number): Promise<void>;

  // User Streaks
  getUserStreaks(userId: string): Promise<UserStreaks | undefined>;
  updateStreak(userId: string, type: 'affirmation' | 'journal' | 'meditation'): Promise<UserStreaks>;

  // Daily Rituals
  getDailyRituals(userId: string): Promise<DailyRitual[]>;
  createDailyRitual(ritual: InsertDailyRitual): Promise<DailyRitual>;
  completeRitual(userId: string, ritualId: number, notes?: string): Promise<RitualCompletion>;
  getRitualCompletions(userId: string, ritualId: number): Promise<RitualCompletion[]>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async getGoal(id: number): Promise<Goal | null> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || null;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: number, updates: UpdateGoalRequest): Promise<Goal> {
    const [updatedGoal] = await db.update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Affirmations
  async getAffirmations(userId: string): Promise<Affirmation[]> {
    return await db.select().from(affirmations).where(eq(affirmations.userId, userId)).orderBy(desc(affirmations.createdAt));
  }

  async createAffirmation(affirmation: InsertAffirmation): Promise<Affirmation> {
    const [newAffirmation] = await db.insert(affirmations).values(affirmation).returning();
    return newAffirmation;
  }

  // Journal
  async getJournalEntries(userId: string): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db.insert(journalEntries).values(entry).returning();
    return newEntry;
  }

  // Vision Boards
  async getVisionBoards(userId: string): Promise<VisionBoard[]> {
    return await db.select().from(visionBoards).where(eq(visionBoards.userId, userId)).orderBy(desc(visionBoards.createdAt));
  }

  async getVisionBoard(id: number): Promise<(VisionBoard & { images: VisionBoardImage[] }) | undefined> {
    const [board] = await db.select().from(visionBoards).where(eq(visionBoards.id, id));
    if (!board) return undefined;

    const images = await db.select().from(visionBoardImages).where(eq(visionBoardImages.visionBoardId, id));
    return { ...board, images };
  }

  async createVisionBoard(board: InsertVisionBoard): Promise<VisionBoard> {
    const [newBoard] = await db.insert(visionBoards).values(board).returning();
    return newBoard;
  }

  async addVisionBoardImage(image: InsertVisionBoardImage): Promise<VisionBoardImage> {
    const [newImage] = await db.insert(visionBoardImages).values(image).returning();
    return newImage;
  }

  // Reminder Settings
  async getReminderSettings(userId: string): Promise<ReminderSettings | undefined> {
    const [settings] = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, userId));
    return settings;
  }

  async getAllReminderSettings(): Promise<ReminderSettings[]> {
    return await db.select().from(reminderSettings);
  }

  async updateReminderLastSent(userId: string): Promise<void> {
    await db
      .update(reminderSettings)
      .set({ lastSentAt: new Date(), updatedAt: new Date() })
      .where(eq(reminderSettings.userId, userId));
  }

  async upsertReminderSettings(userId: string, updates: UpdateReminderSettingsRequest): Promise<ReminderSettings> {
    const existing = await this.getReminderSettings(userId);
    
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    if (existing) {
      const [result] = await db
        .update(reminderSettings)
        .set({ ...cleanUpdates, updatedAt: new Date() })
        .where(eq(reminderSettings.userId, userId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(reminderSettings)
        .values({ ...cleanUpdates, userId })
        .returning();
      return result;
    }
  }

  // Chat Conversations
  async getChatConversations(userId: string): Promise<ChatConversation[]> {
    return await db.select().from(chatConversations).where(eq(chatConversations.userId, userId)).orderBy(desc(chatConversations.updatedAt));
  }

  async getChatConversation(id: number): Promise<(ChatConversation & { messages: ChatMessage[] }) | undefined> {
    const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    if (!conversation) return undefined;

    const messages = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, id)).orderBy(chatMessages.createdAt);
    return { ...conversation, messages };
  }

  async getChatMessagesPaginated(conversationId: number, limit: number = 50, offset: number = 0): Promise<{ messages: ChatMessage[]; total: number }> {
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages).where(eq(chatMessages.conversationId, conversationId));
    const total = Number(countResult?.count || 0);
    
    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { messages: messages.reverse(), total };
  }

  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [newConversation] = await db.insert(chatConversations).values(conversation).returning();
    return newConversation;
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, message.conversationId));
    return newMessage;
  }

  async updateConversationTitle(id: number, title: string): Promise<ChatConversation> {
    const [updated] = await db.update(chatConversations).set({ title, updatedAt: new Date() }).where(eq(chatConversations.id, id)).returning();
    return updated;
  }

  async deleteChatConversation(id: number): Promise<void> {
    await db.delete(chatConversations).where(eq(chatConversations.id, id));
  }

  // User Streaks
  async getUserStreaks(userId: string): Promise<UserStreaks | undefined> {
    const [streaks] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    return streaks;
  }

  async updateStreak(userId: string, type: 'affirmation' | 'journal' | 'meditation'): Promise<UserStreaks> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let existing = await this.getUserStreaks(userId);
    
    if (!existing) {
      const [created] = await db.insert(userStreaks).values({ userId }).returning();
      existing = created;
    }

    const lastDateField = type === 'affirmation' ? 'lastAffirmationDate' : type === 'journal' ? 'lastJournalDate' : 'lastMeditationDate';
    const streakField = type === 'affirmation' ? 'affirmationStreak' : type === 'journal' ? 'journalStreak' : 'meditationStreak';
    const longestField = type === 'affirmation' ? 'longestAffirmationStreak' : type === 'journal' ? 'longestJournalStreak' : undefined;
    const totalField = type === 'affirmation' ? 'totalAffirmations' : type === 'journal' ? 'totalJournalEntries' : undefined;

    const lastDate = existing[lastDateField];
    let newStreak = 1;

    if (lastDate) {
      const lastDateNormalized = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      if (lastDateNormalized.getTime() === today.getTime()) {
        newStreak = existing[streakField] || 1;
      } else if (lastDateNormalized.getTime() === yesterday.getTime()) {
        newStreak = (existing[streakField] || 0) + 1;
      }
    }

    const updates: Record<string, any> = {
      [lastDateField]: now,
      [streakField]: newStreak,
      updatedAt: now,
    };

    if (longestField && newStreak > (existing[longestField] || 0)) {
      updates[longestField] = newStreak;
    }

    if (totalField) {
      updates[totalField] = (existing[totalField] || 0) + 1;
    }

    const [updated] = await db.update(userStreaks).set(updates).where(eq(userStreaks.userId, userId)).returning();
    return updated;
  }

  // Daily Rituals
  async getDailyRituals(userId: string): Promise<DailyRitual[]> {
    return await db.select().from(dailyRituals).where(eq(dailyRituals.userId, userId)).orderBy(dailyRituals.createdAt);
  }

  async createDailyRitual(ritual: InsertDailyRitual): Promise<DailyRitual> {
    const [newRitual] = await db.insert(dailyRituals).values(ritual).returning();
    return newRitual;
  }

  async completeRitual(userId: string, ritualId: number, notes?: string): Promise<RitualCompletion> {
    const [completion] = await db.insert(ritualCompletions).values({ userId, ritualId, notes }).returning();
    return completion;
  }

  async getRitualCompletions(userId: string, ritualId: number): Promise<RitualCompletion[]> {
    return await db.select().from(ritualCompletions)
      .where(and(eq(ritualCompletions.userId, userId), eq(ritualCompletions.ritualId, ritualId)))
      .orderBy(desc(ritualCompletions.completedAt));
  }
}

export const storage = new DatabaseStorage();
// Re-export authStorage for the auth integration
export const authStorage = storage;
