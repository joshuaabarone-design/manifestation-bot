import { aiPost } from "@/lib/ai";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateVisionBoardRequest, type AddVisionBoardImageRequest } from "@shared/routes";

export function useVisionBoards() {
  return useQuery({
    queryKey: [api.visionBoards.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.visionBoards.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vision boards");
      return api.visionBoards.list.responses[200].parse(await res.json());
    },
  });
}

export function useVisionBoard(id: number) {
  return useQuery({
    queryKey: [api.visionBoards.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.visionBoards.get.path, { id });
      const res = await apiFetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch vision board");
      return api.visionBoards.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateVisionBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVisionBoardRequest) => {
      const res = await apiFetch(api.visionBoards.create.path, {
        method: api.visionBoards.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vision board");
      return api.visionBoards.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.visionBoards.list.path] }),
  });
}

export function useAddVisionBoardImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & AddVisionBoardImageRequest) => {
      const url = buildUrl(api.visionBoards.addImage.path, { id });
      const res = await apiFetch(url, {
        method: api.visionBoards.addImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add image to vision board");
      return api.visionBoards.addImage.responses[201].parse(await res.json());
    },
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: [api.visionBoards.get.path, id] }),
  });
}

export function useGenerateVisionBoardImage() {
  return useMutation({
    mutationFn: async ({ prompt }: { prompt: string }) => {
      const json = await aiPost(api.visionBoards.generateImage.path, { prompt }, "Failed to generate image");
      if (json.crisis) throw new Error("We couldn't create that image. Support resources are shown above.");
      return api.visionBoards.generateImage.responses[200].parse(json);
    },
  });
}
