import { useEffect, useRef, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { grantAiConsent, registerConsentOpener } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";

/**
 * One-time consent before any AI feature (Guideline 5.1.2(i)): says exactly what is sent and to whom.
 * Opened on demand by ensureAiConsent(); the server also enforces it (403 AI_CONSENT_REQUIRED).
 */
export function AiConsentDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    registerConsentOpener(
      () =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setOpen(true);
        }),
    );
    const onRequired = () => setOpen(true);
    window.addEventListener("ai-consent-required", onRequired);
    return () => {
      registerConsentOpener(null);
      window.removeEventListener("ai-consent-required", onRequired);
    };
  }, []);

  const finish = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const accept = async () => {
    setBusy(true);
    try {
      await grantAiConsent(true);
      finish(true);
    } catch {
      toast({ title: "Couldn't save your choice", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && finish(false)}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-ai-consent">
        <AlertDialogHeader>
          <AlertDialogTitle>Before you use AI features</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground text-left">
              <p>
                AI guidance, generated affirmations, vision-board images and the guidance chat are created by
                OpenAI. To answer you, Manifest sends OpenAI what you type into these features (your situation,
                goal, theme or image prompt) along with your goal titles when you ask for goal-specific advice.
              </p>
              <p>
                OpenAI processes this data to generate a response. Your name, email and journal are not sent unless
                you type them into an AI prompt. Inputs and outputs are checked by an automated safety filter.
              </p>
              <p>
                AI responses can be inaccurate and are not medical or mental-health advice. You can report any
                response, and you can withdraw this consent at any time in Settings.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-ai-consent-decline">Not now</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void accept();
            }}
            disabled={busy}
            data-testid="button-ai-consent-accept"
          >
            I agree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
