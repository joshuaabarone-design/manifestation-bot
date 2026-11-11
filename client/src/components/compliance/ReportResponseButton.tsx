import { useState } from "react";
import { Flag } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { reportAiResponse, type AiFeature, type ReportReason } from "@/lib/ai";
import { cn } from "@/lib/utils";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "harmful", label: "Harmful or unsafe" },
  { value: "offensive", label: "Offensive or inappropriate" },
  { value: "inaccurate", label: "Inaccurate or misleading" },
  { value: "other", label: "Something else" },
];

/** "Report this response" control for every AI output (Guideline 1.2). */
export function ReportResponseButton({
  feature,
  content,
  className,
}: {
  feature: AiFeature;
  content: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("harmful");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      await reportAiResponse({ feature, reason, content: content.slice(0, 20000), details: details || undefined });
      setDone(true);
      setOpen(false);
      toast({ title: "Report sent", description: "Thanks. We review every report." });
    } catch {
      toast({ title: "Couldn't send report", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={done}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60",
          className,
        )}
        data-testid={`button-report-${feature}`}
      >
        <Flag className="h-3 w-3" />
        {done ? "Reported" : "Report this response"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this response</DialogTitle>
            <DialogDescription>Tell us what was wrong. The response text is included with your report.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-2">
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`reason-${feature}-${r.value}`} />
                <Label htmlFor={`reason-${feature}-${r.value}`}>{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Optional details"
            value={details}
            maxLength={2000}
            onChange={(e) => setDetails(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} isLoading={busy} data-testid="button-submit-report">Send report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
