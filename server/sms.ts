// SMS consent + STOP/HELP keyword handling for affirmation reminders (TCPA / CTIA).
// Twilio also blocks delivery to numbers that replied STOP (Advanced Opt-Out), but we record the
// opt-out ourselves so the scheduler never retries and the Settings screen reflects it.
import type { Express, Request, Response } from "express";
import twilio from "twilio";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { reminderSettings } from "@shared/schema";

export const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"];
export const START_KEYWORDS = ["START", "UNSTOP", "YES"];
export const HELP_KEYWORDS = ["HELP", "INFO"];

export const HELP_REPLY =
  "Manifest daily affirmations: 1 msg/day. Reply STOP to cancel. Msg & data rates may apply. Support: see the Support link in the app.";
export const STOP_REPLY = "You're unsubscribed from Manifest affirmation texts. No more messages will be sent. Reply START to resubscribe.";
export const START_REPLY = "You're resubscribed to Manifest daily affirmation texts. Reply STOP to cancel, HELP for help.";

export function normalizePhone(p: string): string {
  const digits = p.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function classifyKeyword(body: string): "stop" | "start" | "help" | null {
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (STOP_KEYWORDS.includes(word)) return "stop";
  if (START_KEYWORDS.includes(word)) return "start";
  if (HELP_KEYWORDS.includes(word)) return "help";
  return null;
}

export async function applyKeyword(from: string, kind: "stop" | "start" | "help"): Promise<void> {
  const phone = normalizePhone(from);
  if (kind === "stop") {
    await db.update(reminderSettings).set({ smsOptedOutAt: new Date(), updatedAt: new Date() }).where(eq(reminderSettings.phoneNumber, phone));
  } else if (kind === "start") {
    // Only numbers that previously gave in-app consent can be resubscribed by START.
    await db.update(reminderSettings).set({ smsOptedOutAt: null, updatedAt: new Date() }).where(eq(reminderSettings.phoneNumber, phone));
  }
}

function twiml(message: string): string {
  const esc = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc}</Message></Response>`;
}

export function registerSmsRoutes(app: Express): void {
  // Configure this URL as the Twilio number's "A message comes in" webhook.
  app.post("/api/sms/inbound", async (req: Request, res: Response) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const signature = req.get("x-twilio-signature") || "";
      const url = process.env.TWILIO_WEBHOOK_URL || `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      if (!twilio.validateRequest(authToken, signature, url, req.body || {})) {
        return res.status(403).send("Invalid signature");
      }
    } else if (process.env.NODE_ENV === "production") {
      console.warn("[sms] TWILIO_AUTH_TOKEN not set; inbound webhook signatures are not verified");
    }
    const from = String(req.body?.From || "");
    const kind = classifyKeyword(String(req.body?.Body || ""));
    res.type("text/xml");
    if (!from || !kind) return res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    await applyKeyword(from, kind);
    res.send(twiml(kind === "stop" ? STOP_REPLY : kind === "start" ? START_REPLY : HELP_REPLY));
  });
}
