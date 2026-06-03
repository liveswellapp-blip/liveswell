import { useQuery } from "@tanstack/react-query";

const DEMO_USER = { id: "demo", username: "LiveSwell", firstName: "Demo" };

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("demo");
}

export function useAuth() {
  const demo = isDemoMode();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !demo,
  });

  if (demo) {
    return { user: DEMO_USER, isLoading: false, isAuthenticated: true };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
