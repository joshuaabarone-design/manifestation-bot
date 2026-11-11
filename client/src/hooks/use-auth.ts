import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicUser } from "@shared/models/auth";
import { apiFetch, clearTokens, getRefreshToken } from "@/lib/api";
import { clearOfflineData } from "@/lib/native/offline";
import { cancelAffirmationReminders } from "@/lib/native/notifications";
import { queryClient as rootQueryClient } from "@/lib/queryClient";

export type AuthUser = PublicUser;

async function fetchUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/api/auth/user");

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/** Removes every local trace of the session: tokens, encrypted cache, scheduled reminders. */
export async function signOutLocally(): Promise<void> {
  await clearTokens();
  await clearOfflineData();
  await cancelAffirmationReminders();
  rootQueryClient.clear();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    networkMode: "always",
    mutationFn: async () => {
      const refreshToken = await getRefreshToken();
      try {
        await apiFetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });
      } catch {
        /* offline: still sign out on this device */
      }
      await signOutLocally();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
