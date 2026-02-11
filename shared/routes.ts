import { z } from 'zod';
import { 
  insertGoalSchema, 
  insertAffirmationSchema, 
  insertJournalEntrySchema, 
  insertVisionBoardSchema, 
  insertVisionBoardImageSchema,
  insertReminderSettingsSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  insertDailyRitualSchema,
  goals,
  affirmations,
  journalEntries,
  visionBoards,
  visionBoardImages,
  reminderSettings,
  chatConversations,
  chatMessages,
  userStreaks,
  dailyRituals,
  ritualCompletions
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  goals: {
    list: {
      method: 'GET' as const,
      path: '/api/goals',
      responses: {
        200: z.array(z.custom<typeof goals.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/goals',
      input: insertGoalSchema,
      responses: {
        201: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/goals/:id',
      input: insertGoalSchema.partial().extend({ isCompleted: z.boolean().optional() }),
      responses: {
        200: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/goals/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  affirmations: {
    list: {
      method: 'GET' as const,
      path: '/api/affirmations',
      responses: {
        200: z.array(z.custom<typeof affirmations.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/affirmations',
      input: insertAffirmationSchema,
      responses: {
        201: z.custom<typeof affirmations.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/affirmations/generate',
      input: z.object({
        theme: z.string().optional(),
        mood: z.string().optional(),
      }),
      responses: {
        200: z.object({
          affirmation: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  journal: {
    list: {
      method: 'GET' as const,
      path: '/api/journal',
      responses: {
        200: z.array(z.custom<typeof journalEntries.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/journal',
      input: insertJournalEntrySchema,
      responses: {
        201: z.custom<typeof journalEntries.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  visionBoards: {
    list: {
      method: 'GET' as const,
      path: '/api/vision-boards',
      responses: {
        200: z.array(z.custom<typeof visionBoards.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vision-boards/:id',
      responses: {
        200: z.custom<typeof visionBoards.$inferSelect & { images: (typeof visionBoardImages.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vision-boards',
      input: insertVisionBoardSchema,
      responses: {
        201: z.custom<typeof visionBoards.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    addImage: {
      method: 'POST' as const,
      path: '/api/vision-boards/:id/images',
      input: z.object({
        imageUrl: z.string().url(),
        caption: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof visionBoardImages.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
     generateImage: {
      method: 'POST' as const,
      path: '/api/vision-boards/generate-image',
      input: z.object({
        prompt: z.string(),
      }),
      responses: {
        200: z.object({
          imageUrl: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  manifestation: {
    getAdvice: {
      method: 'POST' as const,
      path: '/api/manifestation/advice',
      input: z.object({
        situation: z.string(),
        goal: z.string().optional(),
      }),
      responses: {
        200: z.object({
          advice: z.string(),
          suggestedAffirmations: z.array(z.string()),
          suggestedActions: z.array(z.string()),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  reminders: {
    get: {
      method: 'GET' as const,
      path: '/api/reminders/settings',
      responses: {
        200: z.custom<typeof reminderSettings.$inferSelect>().nullable(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/reminders/settings',
      input: insertReminderSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof reminderSettings.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  chat: {
    listConversations: {
      method: 'GET' as const,
      path: '/api/chat/conversations',
      responses: {
        200: z.array(z.custom<typeof chatConversations.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    getConversation: {
      method: 'GET' as const,
      path: '/api/chat/conversations/:id',
      responses: {
        200: z.custom<typeof chatConversations.$inferSelect & { messages: (typeof chatMessages.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    createConversation: {
      method: 'POST' as const,
      path: '/api/chat/conversations',
      input: insertChatConversationSchema,
      responses: {
        201: z.custom<typeof chatConversations.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    addMessage: {
      method: 'POST' as const,
      path: '/api/chat/conversations/:id/messages',
      input: z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
      responses: {
        201: z.custom<typeof chatMessages.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    getMessagesPaginated: {
      method: 'GET' as const,
      path: '/api/chat/conversations/:id/messages',
      responses: {
        200: z.object({
          messages: z.array(z.custom<typeof chatMessages.$inferSelect>()),
          total: z.number(),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    deleteConversation: {
      method: 'DELETE' as const,
      path: '/api/chat/conversations/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  streaks: {
    get: {
      method: 'GET' as const,
      path: '/api/streaks',
      responses: {
        200: z.custom<typeof userStreaks.$inferSelect>().nullable(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/streaks/:type',
      responses: {
        200: z.custom<typeof userStreaks.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  rituals: {
    list: {
      method: 'GET' as const,
      path: '/api/rituals',
      responses: {
        200: z.array(z.custom<typeof dailyRituals.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/rituals',
      input: insertDailyRitualSchema,
      responses: {
        201: z.custom<typeof dailyRituals.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/rituals/:id/complete',
      input: z.object({
        notes: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof ritualCompletions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    getCompletions: {
      method: 'GET' as const,
      path: '/api/rituals/:id/completions',
      responses: {
        200: z.array(z.custom<typeof ritualCompletions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
