// Affirmation SMS Scheduler
import { storage } from "./storage";
import { sendSMS } from "./twilio";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function generateAffirmation(): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a manifestation coach. Generate ONE powerful, positive affirmation 
            that helps with abundance, success, love, or personal growth. 
            Keep it under 160 characters for SMS. Just return the affirmation text, no quotes.`
        },
        {
          role: "user",
          content: "Generate a daily affirmation"
        }
      ],
      max_tokens: 100
    });

    return response.choices[0].message.content?.trim() || "I am worthy of all the abundance the universe has to offer.";
  } catch (error) {
    console.error("[scheduler] Error generating affirmation:", error);
    return "I am worthy of all the abundance the universe has to offer.";
  }
}

function getCurrentTimeInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(now);
  } catch {
    return new Date().toTimeString().slice(0, 5);
  }
}

function shouldSendNow(reminderTime: string, timezone: string): boolean {
  const currentTime = getCurrentTimeInTimezone(timezone);
  return currentTime === reminderTime;
}

async function processReminders() {
  console.log("[scheduler] Checking for scheduled affirmations...");
  
  try {
    const allSettings = await storage.getAllReminderSettings();
    
    for (const settings of allSettings) {
      if (!settings.isEnabled || settings.deliveryMethod !== 'sms' || !settings.phoneNumber) {
        continue;
      }

      const timezone = settings.timezone || 'America/New_York';
      const reminderTime = settings.reminderTime || '09:00';

      if (shouldSendNow(reminderTime, timezone)) {
        // Check if we already sent today
        const lastSent = settings.lastSentAt;
        const today = new Date().toDateString();
        
        if (lastSent && new Date(lastSent).toDateString() === today) {
          continue; // Already sent today
        }

        console.log(`[scheduler] Sending affirmation to ${settings.userId}`);
        
        const affirmation = await generateAffirmation();
        const result = await sendSMS(settings.phoneNumber, `Your daily affirmation:\n\n${affirmation}`);
        
        if (result.success) {
          await storage.updateReminderLastSent(settings.userId);
          console.log(`[scheduler] Affirmation sent successfully to ${settings.userId}`);
        } else {
          console.error(`[scheduler] Failed to send to ${settings.userId}:`, result.error);
        }
      }
    }
  } catch (error) {
    console.error("[scheduler] Error processing reminders:", error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (schedulerInterval) {
    return;
  }

  console.log("[scheduler] Starting affirmation scheduler (checking every minute)");
  
  // Check every minute
  schedulerInterval = setInterval(processReminders, 60 * 1000);
  
  // Run once immediately
  processReminders();
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[scheduler] Scheduler stopped");
  }
}
