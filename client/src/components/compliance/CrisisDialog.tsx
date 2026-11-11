import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_CRISIS_RESOURCES, type CrisisResource } from "@/lib/ai";

/** Shown whenever moderation detects self-harm content in an AI input or output. */
export function CrisisResources({ resources = DEFAULT_CRISIS_RESOURCES }: { resources?: CrisisResource[] }) {
  return (
    <ul className="space-y-2">
      {resources.map((r) => (
        <li key={r.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="text-sm text-muted-foreground">
            {r.contact}
            {r.url && (
              <>
                {" · "}
                <a href={r.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {r.url.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CrisisDialog() {
  const [resources, setResources] = useState<CrisisResource[] | null>(null);

  useEffect(() => {
    const onCrisis = (e: Event) => setResources((e as CustomEvent<CrisisResource[]>).detail ?? DEFAULT_CRISIS_RESOURCES);
    window.addEventListener("ai-crisis", onCrisis);
    return () => window.removeEventListener("ai-crisis", onCrisis);
  }, []);

  return (
    <Dialog open={!!resources} onOpenChange={(o) => !o && setResources(null)}>
      <DialogContent data-testid="dialog-crisis">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> You don't have to go through this alone
          </DialogTitle>
          <DialogDescription>
            It sounds like you may be going through something really hard. Manifest can't provide crisis support,
            but trained people are available right now, for free, 24/7. If you are in immediate danger, call 911
            or your local emergency number.
          </DialogDescription>
        </DialogHeader>
        <CrisisResources resources={resources ?? undefined} />
      </DialogContent>
    </Dialog>
  );
}
