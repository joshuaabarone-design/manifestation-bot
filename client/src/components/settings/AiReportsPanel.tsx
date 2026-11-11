import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiReport } from "@shared/schema";

/** Admin moderation queue for "Report this response" submissions. */
export function AiReportsPanel() {
  const { data: reports, isLoading } = useQuery<AiReport[]>({ queryKey: ["/api/admin/ai-reports"] });
  const markReviewed = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/ai-reports/${id}`, { status: "reviewed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-reports"] }),
  });

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" /> Reported AI responses
        </CardTitle>
        <CardDescription>Submitted by users with "Report this response". Review within 24 hours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !reports?.length && <p className="text-sm text-muted-foreground">No reports.</p>}
        {reports?.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/10 p-3 space-y-2" data-testid={`ai-report-${r.id}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
              <Badge variant="outline">{r.feature}</Badge>
              <Badge variant="outline">{r.reason}</Badge>
              {r.createdAt && <span className="text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</span>}
            </div>
            <p className="text-sm whitespace-pre-wrap line-clamp-6">{r.content}</p>
            {r.details && <p className="text-xs text-muted-foreground">User note: {r.details}</p>}
            {r.status === "open" && (
              <Button size="sm" variant="outline" onClick={() => markReviewed.mutate(r.id)} isLoading={markReviewed.isPending}>
                Mark reviewed
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
