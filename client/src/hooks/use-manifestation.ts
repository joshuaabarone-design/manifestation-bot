import { aiPost } from "@/lib/ai";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useManifestationAdvice() {
  return useMutation({
    mutationFn: async (data: { situation: string; goal?: string }) => {
      const json = await aiPost(api.manifestation.getAdvice.path, data, "Failed to get advice");
      return api.manifestation.getAdvice.responses[200].parse(json);
    },
  });
}
