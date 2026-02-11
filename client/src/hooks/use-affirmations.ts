import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateAffirmationRequest, type GenerateAffirmationRequest } from "@shared/routes";

export function useAffirmations() {
  return useQuery({
    queryKey: [api.affirmations.list.path],
    queryFn: async () => {
      const res = await fetch(api.affirmations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch affirmations");
      return api.affirmations.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAffirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAffirmationRequest) => {
      const res = await fetch(api.affirmations.create.path, {
        method: api.affirmations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create affirmation");
      return api.affirmations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.affirmations.list.path] }),
  });
}

export function useGenerateAffirmation() {
  return useMutation({
    mutationFn: async (data: GenerateAffirmationRequest) => {
      const res = await fetch(api.affirmations.generate.path, {
        method: api.affirmations.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate affirmation");
      return api.affirmations.generate.responses[200].parse(await res.json());
    },
  });
}
