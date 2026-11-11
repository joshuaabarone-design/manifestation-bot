// AI safety (Guidelines 1.1/1.2/1.4.1): OpenAI moderation on every AI input and output, a crisis
// resource response when self-harm is detected, and a one-time AI data-sharing consent gate.
import OpenAI from "openai";
import type { RequestHandler, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/models/auth";

export const CRISIS_MESSAGE =
  "It sounds like you may be going through something really painful. You don't have to face it alone. " +
  "If you are in the U.S., call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). " +
  "If you are elsewhere, find a local helpline at https://findahelpline.com. " +
  "If you are in immediate danger, call your local emergency number (911 in the U.S.). " +
  "This app is not medical or mental-health treatment.";

export const CRISIS_RESOURCES = [
  { name: "988 Suicide & Crisis Lifeline (U.S.)", contact: "Call or text 988", url: "https://988lifeline.org" },
  { name: "Crisis Text Line (U.S./UK/CA/IE)", contact: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  { name: "Find a helpline (international)", contact: "findahelpline.com", url: "https://findahelpline.com" },
];

export const BLOCKED_MESSAGE =
  "This request can't be processed because it may break our content guidelines. Please rephrase and try again.";

export const SAFE_OUTPUT_FALLBACK =
  "I'm not able to share that response. Try asking in a different way, or focus on one small, kind step you can take today.";

// Local backstop: runs even when the moderation API is unreachable, so crisis help is never skipped.
const SELF_HARM_PATTERNS = [
  /\b(kill|hurt|harm|cut)\s+(myself|me)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+(it\s+all|my\s+(own\s+)?life)\b/i,
  /\b(take|taking)\s+my\s+(own\s+)?life\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bself[-\s]?harm\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\boverdos(e|ing)\b/i,
];

export function localSelfHarmCheck(text: string): boolean {
  return SELF_HARM_PATTERNS.some((re) => re.test(text));
}

export interface ModerationResult {
  flagged: boolean;
  selfHarm: boolean;
  categories: string[];
  /** true when the moderation API could not be reached */
  unavailable?: boolean;
}

type ModerationClient = Pick<OpenAI, "moderations">;
let client: ModerationClient | null = null;
function moderationClient(): ModerationClient {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_MODERATION_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.OPENAI_MODERATION_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return client;
}
/** Test hook. */
export function setModerationClient(c: ModerationClient | null) {
  client = c;
}

/** MODERATION_FAIL_MODE=closed (default) blocks AI calls when moderation is unreachable. */
function failClosed(): boolean {
  return (process.env.MODERATION_FAIL_MODE || "closed").toLowerCase() !== "open";
}

export async function moderate(text: string): Promise<ModerationResult> {
  const localSelfHarm = localSelfHarmCheck(text);
  if (!text.trim()) return { flagged: false, selfHarm: false, categories: [] };
  try {
    const res = await moderationClient().moderations.create({ model: "omni-moderation-latest", input: text });
    const r = res.results[0];
    const categories = Object.entries(r.categories || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
    const selfHarm = localSelfHarm || categories.some((c) => c.startsWith("self-harm"));
    return { flagged: r.flagged || selfHarm, selfHarm, categories };
  } catch (err) {
    console.error("[moderation] API unavailable:", (err as Error)?.message);
    return { flagged: localSelfHarm || failClosed(), selfHarm: localSelfHarm, categories: [], unavailable: true };
  }
}

/**
 * Screen user input before it reaches OpenAI. Returns true if the request was answered here
 * (crisis resources or a block), in which case the caller must stop.
 */
export async function screenInput(res: Response, text: string, crisisBody?: (msg: string) => unknown): Promise<boolean> {
  const m = await moderate(text);
  if (m.selfHarm) {
    res.status(200).json(crisisBody ? crisisBody(CRISIS_MESSAGE) : { crisis: true, message: CRISIS_MESSAGE, resources: CRISIS_RESOURCES });
    return true;
  }
  if (m.flagged) {
    res.status(m.unavailable ? 503 : 400).json({
      moderated: true,
      message: m.unavailable ? "Safety checks are temporarily unavailable. Please try again shortly." : BLOCKED_MESSAGE,
    });
    return true;
  }
  return false;
}

/** Screen model output; returns the text to show (fallback when flagged). */
export async function screenOutput(text: string): Promise<{ text: string; flagged: boolean; selfHarm: boolean }> {
  const m = await moderate(text);
  if (m.selfHarm) return { text: CRISIS_MESSAGE, flagged: true, selfHarm: true };
  if (m.flagged) return { text: SAFE_OUTPUT_FALLBACK, flagged: true, selfHarm: false };
  return { text, flagged: false, selfHarm: false };
}

// ---- One-time consent before AI features (Guideline 5.1.2) ----

export async function hasAiConsent(userId: string): Promise<boolean> {
  const [row] = await db.select({ at: users.aiConsentAt }).from(users).where(eq(users.id, userId));
  return !!row?.at;
}

export async function recordAiConsent(userId: string, granted: boolean): Promise<void> {
  await db.update(users).set({ aiConsentAt: granted ? new Date() : null, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Use after isAuthenticated on every route that sends user content to OpenAI. */
export const requireAiConsent: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as any)?.claims?.sub as string | undefined;
    if (!userId || !(await hasAiConsent(userId))) {
      return res.status(403).json({
        code: "AI_CONSENT_REQUIRED",
        message: "Please review and accept how AI features use your content before continuing.",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
