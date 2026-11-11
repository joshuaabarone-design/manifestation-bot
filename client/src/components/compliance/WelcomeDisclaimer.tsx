import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { WELLNESS_DISCLAIMER } from "./WellnessDisclaimer";

/** One-time onboarding notice after first sign-in on this device. */
export function WelcomeDisclaimer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const key = user ? `mb.wellnessAck.${user.id}` : null;

  useEffect(() => {
    if (key && !localStorage.getItem(key)) setOpen(true);
  }, [key]);

  if (!key) return null;
  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="dialog-welcome-disclaimer">
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome to Manifest</AlertDialogTitle>
          <AlertDialogDescription>{WELLNESS_DISCLAIMER}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              localStorage.setItem(key, new Date().toISOString());
              setOpen(false);
            }}
            data-testid="button-welcome-ack"
          >
            I understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
