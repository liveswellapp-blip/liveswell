import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const DEMO_USER = { id: "demo", username: "LiveSwell", firstName: "Demo" };

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("demo");
}

/** True when Clerk has written a session to localStorage but hasn't hydrated yet. */
function hasStoredClerkSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("__clerk_db_jwt"));
  } catch {
    return false;
  }
}

export function useAuth() {
  const demo = isDemoMode();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  // Upsert the local users row on first sign-in so that all FK-backed
  // endpoints (favorites, alerts, push tokens, etc.) always have a valid
  // row to reference.  The query is cached for 5 min so it fires at most
  // once per session, not on every render.
  useQuery<unknown>({
    queryKey: ["/api/auth/user"],
    enabled: !demo && isLoaded && !!clerkUser,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const logout = async () => {
    queryClient.clear();
    await signOut();
  };

  if (demo) {
    return {
      user: DEMO_USER,
      isLoading: false,
      isAuthenticated: true,
      logout: async () => {},
    };
  }

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      }
    : null;

  // Keep the spinner up when Clerk has a stored JWT but hasn't hydrated the
  // user object yet — prevents a one-frame Landing page flash on hard refresh.
  const sessionRestorePending = isLoaded && !clerkUser && hasStoredClerkSession();

  return {
    user,
    isLoading: !isLoaded || sessionRestorePending,
    isAuthenticated: !!clerkUser,
    logout,
  };
}
