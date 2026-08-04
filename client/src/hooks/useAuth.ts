import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const DEMO_USER = { id: "demo", username: "LiveSwell", firstName: "Demo" };

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("demo");
}

export function useAuth() {
  const demo = isDemoMode();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !demo,
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore network errors on logout
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.clear();
    setLocation("/login");
  };

  if (demo) {
    return { user: DEMO_USER, isLoading: false, isAuthenticated: true, logout: async () => {} };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
