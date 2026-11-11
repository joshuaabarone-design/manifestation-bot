import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

export const WELLNESS_DISCLAIMER =
  "Manifest is a personal wellness and self-reflection tool. It is not medical or mental-health treatment, " +
  "and it does not diagnose, treat or prevent any condition. AI guidance can be wrong. If you are in crisis or " +
  "thinking about harming yourself, call or text 988 in the U.S., or contact local emergency services.";

export function WellnessDisclaimer({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 text-muted-foreground flex gap-3",
        compact ? "p-3 text-xs" : "p-4 text-sm",
        className,
      )}
      data-testid="wellness-disclaimer"
    >
      <HeartPulse className={cn("shrink-0 text-primary", compact ? "h-4 w-4 mt-0.5" : "h-5 w-5")} />
      <p>{WELLNESS_DISCLAIMER}</p>
    </div>
  );
}
