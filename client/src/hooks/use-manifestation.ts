import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useManifestationAdvice() {
  return useMutation({
    mutationFn: async (data: { situation: string; goal?: string }) => {
      const res = await fetch(api.manifestation.getAdvice.path, {
        method: api.manifestation.getAdvice.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to get advice");
      return api.manifestation.getAdvice.responses[200].parse(await res.json());
    },
  });
}
