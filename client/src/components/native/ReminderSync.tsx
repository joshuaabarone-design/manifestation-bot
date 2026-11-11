import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAffirmations } from "@/hooks/use-affirmations";
import { isNative } from "@/lib/platform";
import { scheduleAffirmationReminders, type ReminderSettingsLike } from "@/lib/native/notifications";

/**
 * iOS: keeps on-device local notifications in sync with the saved reminder settings and the
 * user's affirmations, so reminders fire even offline. Renders nothing.
 */
export function ReminderSync() {
  const { isAuthenticated } = useAuth();
  const enabled = isNative && isAuthenticated;
  const { data: settings } = useQuery<ReminderSettingsLike>({ queryKey: ["/api/reminders/settings"], enabled });
  const { data: affirmations } = useAffirmations({ enabled });

  useEffect(() => {
    if (!enabled || !settings) return;
    void scheduleAffirmationReminders(settings, affirmations ?? []).catch(() => undefined);
  }, [enabled, settings, affirmations]);

  return null;
}
