import { haptic } from "@/lib/native";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateGoalRequest, type UpdateGoalRequest } from "@shared/routes";

export function useGoals() {
  return useQuery({
    queryKey: [api.goals.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.goals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch goals");
      return api.goals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGoalRequest) => {
      const res = await apiFetch(api.goals.create.path, {
        method: api.goals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return api.goals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      haptic("success");
      return queryClient.invalidateQueries({ queryKey: [api.goals.list.path] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateGoalRequest) => {
      const url = buildUrl(api.goals.update.path, { id });
      const res = await apiFetch(url, {
        method: api.goals.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return api.goals.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      haptic("success");
      return queryClient.invalidateQueries({ queryKey: [api.goals.list.path] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.goals.delete.path, { id });
      const res = await apiFetch(url, {
        method: api.goals.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete goal");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goals.list.path] }),
  });
}
