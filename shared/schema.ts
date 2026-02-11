import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
// Re-export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

// === TABLE DEFINITIONS ===
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  isCompleted: boolean("is_completed").default(false),
  progress: integer("progress").default(0), // 0-100 percentage
  milestones: jsonb("milestones").$type<{ id: string; text: string; completed: boolean }[]>().default([]),
  beliefLevel: integer("belief_level").default(50), // 0-100 confidence rating
  evidenceNotes: text("evidence_notes"), // Notes about manifestation evidence
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat conversation history
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").default("New Conversation"),
  mode: text("mode").default("general"), // 'general', 'goal_review', 'affirmation_coaching', 'mindset_shift'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  actionItems: jsonb("action_items").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// User streaks and habits
export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  affirmationStreak: integer("affirmation_streak").default(0),
  journalStreak: integer("journal_streak").default(0),
  meditationStreak: integer("meditation_streak").default(0),
  lastAffirmationDate: timestamp("last_affirmation_date"),
  lastJournalDate: timestamp("last_journal_date"),
  lastMeditationDate: timestamp("last_meditation_date"),
  longestAffirmationStreak: integer("longest_affirmation_streak").default(0),
  longestJournalStreak: integer("longest_journal_streak").default(0),
  totalAffirmations: integer("total_affirmations").default(0),
  totalJournalEntries: integer("total_journal_entries").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily rituals
export const dailyRituals = pgTable("daily_rituals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // 'morning', 'evening', '33x3'
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").$type<{ id: string; text: string; duration?: number }[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ritualCompletions = pgTable("ritual_completions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ritualId: integer("ritual_id").notNull().references(() => dailyRituals.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

export const affirmations = pgTable("affirmations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  mood: text("mood"), // e.g., 'happy', 'neutral', 'sad'
  manifestationFocus: text("manifestation_focus"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visionBoards = pgTable("vision_boards", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visionBoardImages = pgTable("vision_board_images", {
  id: serial("id").primaryKey(),
  visionBoardId: integer("vision_board_id").notNull().references(() => visionBoards.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminderSettings = pgTable("reminder_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  isEnabled: boolean("is_enabled").default(false),
  reminderTime: text("reminder_time").default("09:00"), // HH:MM format
  timezone: text("timezone").default("America/New_York"),
  deliveryMethod: text("delivery_method").default("app"), // 'app', 'email', 'sms', 'both'
  email: text("email"),
  phoneNumber: text("phone_number"),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===
export const visionBoardsRelations = relations(visionBoards, ({ many }) => ({
  images: many(visionBoardImages),
}));

export const visionBoardImagesRelations = relations(visionBoardImages, ({ one }) => ({
  visionBoard: one(visionBoards, {
    fields: [visionBoardImages.visionBoardId],
    references: [visionBoards.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const dailyRitualsRelations = relations(dailyRituals, ({ many }) => ({
  completions: many(ritualCompletions),
}));

export const ritualCompletionsRelations = relations(ritualCompletions, ({ one }) => ({
  ritual: one(dailyRituals, {
    fields: [ritualCompletions.ritualId],
    references: [dailyRituals.id],
  }),
}));

// === INSERT SCHEMAS ===
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertAffirmationSchema = createInsertSchema(affirmations).omit({ id: true, createdAt: true, userId: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, userId: true });
export const insertVisionBoardSchema = createInsertSchema(visionBoards).omit({ id: true, createdAt: true, userId: true });
export const insertVisionBoardImageSchema = createInsertSchema(visionBoardImages).omit({ id: true, createdAt: true });
export const insertReminderSettingsSchema = createInsertSchema(reminderSettings).omit({ id: true, createdAt: true, updatedAt: true, userId: true, lastSentAt: true });
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertUserStreaksSchema = createInsertSchema(userStreaks).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertDailyRitualSchema = createInsertSchema(dailyRituals).omit({ id: true, createdAt: true, userId: true });
export const insertRitualCompletionSchema = createInsertSchema(ritualCompletions).omit({ id: true, completedAt: true, userId: true });


// === EXPLICIT API CONTRACT TYPES ===
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema> & { userId: string };
export type CreateGoalRequest = z.infer<typeof insertGoalSchema>;
export type UpdateGoalRequest = Partial<CreateGoalRequest> & { isCompleted?: boolean };

export type Affirmation = typeof affirmations.$inferSelect;
export type InsertAffirmation = z.infer<typeof insertAffirmationSchema> & { userId: string };
export type CreateAffirmationRequest = z.infer<typeof insertAffirmationSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema> & { userId: string };
export type CreateJournalEntryRequest = z.infer<typeof insertJournalEntrySchema>;

export type VisionBoard = typeof visionBoards.$inferSelect;
export type InsertVisionBoard = z.infer<typeof insertVisionBoardSchema> & { userId: string };
export type CreateVisionBoardRequest = z.infer<typeof insertVisionBoardSchema>;

export type VisionBoardImage = typeof visionBoardImages.$inferSelect;
export type InsertVisionBoardImage = z.infer<typeof insertVisionBoardImageSchema> & { visionBoardId: number };
export type AddVisionBoardImageRequest = z.infer<typeof insertVisionBoardImageSchema>;


export type ManifestationAdviceResponse = {
  advice: string;
  suggestedAffirmations: string[];
  suggestedActions: string[];
};

export type GenerateAffirmationRequest = {
  theme?: string;
  mood?: string;
};

export type ReminderSettings = typeof reminderSettings.$inferSelect;
export type InsertReminderSettings = z.infer<typeof insertReminderSettingsSchema>;
export type UpdateReminderSettingsRequest = Partial<InsertReminderSettings>;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema> & { userId: string };
export type CreateChatConversationRequest = z.infer<typeof insertChatConversationSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type CreateChatMessageRequest = { content: string; conversationId?: number };

export type UserStreaks = typeof userStreaks.$inferSelect;
export type InsertUserStreaks = z.infer<typeof insertUserStreaksSchema> & { userId: string };

export type DailyRitual = typeof dailyRituals.$inferSelect;
export type InsertDailyRitual = z.infer<typeof insertDailyRitualSchema> & { userId: string };
export type CreateDailyRitualRequest = z.infer<typeof insertDailyRitualSchema>;

export type RitualCompletion = typeof ritualCompletions.$inferSelect;
export type InsertRitualCompletion = z.infer<typeof insertRitualCompletionSchema> & { userId: string };

export type Milestone = { id: string; text: string; completed: boolean };
export type RitualStep = { id: string; text: string; duration?: number };
