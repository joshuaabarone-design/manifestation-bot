import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateJournalEntryRequest } from "@shared/routes";
import type { JournalEntry } from "@shared/schema";
import { haptic } from "@/lib/native";
import { enqueueJournalWrite, isLikelyOffline, newClientId } from "@/lib/native/offline";

export function useJournalEntries() {
  return useQuery({
    queryKey: [api.journal.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.journal.list.path);
      if (!res.ok) throw new Error("Failed to fetch journal entries");
      return api.journal.list.responses[200].parse(await res.json());
    },
  });
}

export type CreateJournalResult = JournalEntry & { queuedOffline?: boolean };

/**
 * Creates a journal entry. Every write carries a clientId, so a write queued while offline
 * (iOS app) can be replayed later without creating duplicates.
 */
export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async (data: CreateJournalEntryRequest): Promise<CreateJournalResult> => {
      const payload = { ...data, clientId: data.clientId ?? newClientId() };
      if (await isLikelyOffline()) {
        return enqueueJournalWrite(payload);
      }
      let res: Response;
      try {
        res = await apiFetch(api.journal.create.path, {
          method: api.journal.create.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Network failure: queue it on device instead of losing the entry.
        const queued = await enqueueJournalWrite(payload).catch(() => null);
        if (queued) return queued;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to create journal entry");
      return api.journal.create.responses[201].parse(await res.json());
    },
    onSuccess: (entry) => {
      haptic("success");
      if (entry.queuedOffline) {
        queryClient.setQueryData<JournalEntry[]>([api.journal.list.path], (old) => [entry, ...(old ?? [])]);
        return;
      }
      return queryClient.invalidateQueries({ queryKey: [api.journal.list.path] });
    },
  });
}
