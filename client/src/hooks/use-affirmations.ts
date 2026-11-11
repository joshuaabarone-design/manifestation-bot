import { aiPost } from "@/lib/ai";
import { haptic } from "@/lib/native";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateAffirmationRequest, type GenerateAffirmationRequest } from "@shared/routes";

export function useAffirmations(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: [api.affirmations.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.affirmations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch affirmations");
      return api.affirmations.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAffirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAffirmationRequest) => {
      const res = await apiFetch(api.affirmations.create.path, {
        method: api.affirmations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create affirmation");
      return api.affirmations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      haptic("success");
      return queryClient.invalidateQueries({ queryKey: [api.affirmations.list.path] });
    },
  });
}

export function useGenerateAffirmation() {
  return useMutation({
    mutationFn: async (data: GenerateAffirmationRequest) => {
      // Consent check, moderation errors and crisis resources are handled in aiPost.
      const json = await aiPost(api.affirmations.generate.path, data, "Failed to generate affirmation");
      return api.affirmations.generate.responses[200].parse(json);
    },
  });
}
