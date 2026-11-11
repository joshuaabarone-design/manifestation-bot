import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "../platform";

/** Notification ids 7001-7007 are reserved for the weekly affirmation reminder set. */
const BASE_ID = 7000;
const IDS = [1, 2, 3, 4, 5, 6, 7].map((d) => BASE_ID + d);

export interface ReminderSettingsLike {
  isEnabled?: boolean | null;
  reminderTime?: string | null; // "HH:MM" in `timezone`
  timezone?: string | null;
  deliveryMethod?: string | null; // 'app' | 'email' | 'sms' | 'both'
}

/** Minutes east of UTC for `timeZone` at `at`. */
function tzOffsetMinutes(timeZone: string, at = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * Converts the user's reminder time (in their chosen time zone) into device-local
 * hour/minute plus a day shift, so the on-device schedule fires at the intended moment.
 */
export function toDeviceLocal(reminderTime: string, timeZone: string, now = new Date()) {
  const [h, m] = reminderTime.split(":").map((n) => Number(n));
  let mins = h * 60 + m;
  try {
    const deviceOffset = -now.getTimezoneOffset();
    mins += deviceOffset - tzOffsetMinutes(timeZone, now);
  } catch {
    /* unknown zone: treat as device-local */
  }
  const dayShift = Math.floor(mins / 1440);
  mins = ((mins % 1440) + 1440) % 1440;
  return { hour: Math.floor(mins / 60), minute: mins % 60, dayShift };
}

export async function cancelAffirmationReminders(): Promise<void> {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) });
  } catch {
    /* nothing scheduled */
  }
}

/**
 * Schedules on-device affirmation reminders from the saved reminder settings: one weekly
 * notification per weekday at the chosen time, each showing one of the user's affirmations.
 * Returns false if the user has not granted notification permission.
 */
export async function scheduleAffirmationReminders(
  settings: ReminderSettingsLike | null | undefined,
  affirmations: { content: string }[],
  { prompt = false }: { prompt?: boolean } = {},
): Promise<boolean> {
  if (!isNative) return true;
  await cancelAffirmationReminders();
  const inApp = settings?.deliveryMethod === "app" || settings?.deliveryMethod === "both" || !settings?.deliveryMethod;
  if (!settings?.isEnabled || !inApp) return true;

  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted" && prompt) perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return false;

  const { hour, minute, dayShift } = toDeviceLocal(settings.reminderTime || "09:00", settings.timezone || "America/New_York");
  const texts = affirmations.length
    ? affirmations.map((a) => a.content)
    : ["I am worthy of my dreams, and I take one aligned step today."];

  await LocalNotifications.schedule({
    notifications: IDS.map((id, i) => {
      const userWeekday = i + 1; // 1 = Sunday … 7 = Saturday, in the user's time zone
      const weekday = ((userWeekday - 1 + dayShift + 7) % 7) + 1;
      return {
        id,
        title: "Your daily affirmation",
        body: texts[i % texts.length].slice(0, 180),
        schedule: { on: { weekday, hour, minute }, allowWhileIdle: true },
        extra: { route: "/affirmations" },
      };
    }),
  });
  return true;
}
