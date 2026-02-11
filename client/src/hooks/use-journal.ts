import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateJournalEntryRequest } from "@shared/routes";

export function useJournalEntries() {
  return useQuery({
    queryKey: [api.journal.list.path],
    queryFn: async () => {
      const res = await fetch(api.journal.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch journal entries");
      return api.journal.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateJournalEntryRequest) => {
      const res = await fetch(api.journal.create.path, {
        method: api.journal.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create journal entry");
      return api.journal.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.journal.list.path] }),
  });
}
