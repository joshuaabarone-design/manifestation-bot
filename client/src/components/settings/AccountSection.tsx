import { useState } from "react";
import { Bot, ExternalLink, ShieldCheck, Trash2, UserX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, signOutLocally } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { grantAiConsent } from "@/lib/ai";
import { WellnessDisclaimer } from "@/components/compliance/WellnessDisclaimer";

const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL as string | undefined;
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL as string | undefined;

/** Settings: AI data sharing, wellness disclaimer, legal links and in-app account deletion (5.1.1(v)). */
export function AccountSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const aiOn = !!user?.aiConsentAt;

  const toggleAi = async (on: boolean) => {
    setAiBusy(true);
    try {
      await grantAiConsent(on);
      toast({
        title: on ? "AI features turned on" : "AI features turned off",
        description: on ? "You can turn this off any time." : "We'll ask again before any AI feature sends data to OpenAI.",
      });
    } catch {
      toast({ title: "Couldn't update", description: "Please try again.", variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOutLocally();
      toast({ title: "Account deleted", description: "Your account and all of its data have been permanently deleted." });
      setTimeout(() => (window.location.href = "/"), 600);
    } catch {
      setDeleting(false);
      toast({
        title: "Couldn't delete your account",
        description: "Check your connection and try again. If it keeps failing, contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>AI features</CardTitle>
              <CardDescription>Guidance, generated affirmations, images and chat use OpenAI</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ai-consent" className="text-sm font-normal text-muted-foreground">
              Allow Manifest to send what I type into AI features to OpenAI to generate responses
            </Label>
            <Switch id="ai-consent" checked={aiOn} onCheckedChange={toggleAi} disabled={aiBusy} data-testid="switch-ai-consent" />
          </div>
          <p className="text-xs text-muted-foreground">
            Every AI response has a "Report this response" link. Reports are reviewed by the developer.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Wellness &amp; privacy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WellnessDisclaimer />
          <div className="flex flex-wrap gap-4 text-sm">
            {PRIVACY_URL && (
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                Privacy policy <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {SUPPORT_URL && (
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                Support <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Delete account</CardTitle>
              <CardDescription>
                Permanently delete your account and everything in it: goals, affirmations, journal, vision boards,
                rituals, streaks, chats and reminder settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)} data-testid="button-delete-account">
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. All of your data is deleted from our servers right away, you're signed out on
              this device, and if you used Sign in with Apple, Manifest's access to your Apple ID is revoked.
              Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoCapitalize="characters"
            data-testid="input-delete-confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText.trim() !== "DELETE"}
              isLoading={deleting}
              onClick={deleteAccount}
              data-testid="button-confirm-delete-account"
            >
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
