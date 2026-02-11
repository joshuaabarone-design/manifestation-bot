import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateVisionBoardRequest, type AddVisionBoardImageRequest } from "@shared/routes";

export function useVisionBoards() {
  return useQuery({
    queryKey: [api.visionBoards.list.path],
    queryFn: async () => {
      const res = await fetch(api.visionBoards.list.path, { credentials: "include" });
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
      const res = await fetch(url, { credentials: "include" });
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
      const res = await fetch(api.visionBoards.create.path, {
        method: api.visionBoards.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
      const res = await fetch(url, {
        method: api.visionBoards.addImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
      const res = await fetch(api.visionBoards.generateImage.path, {
        method: api.visionBoards.generateImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate image");
      return api.visionBoards.generateImage.responses[200].parse(await res.json());
    },
  });
}
