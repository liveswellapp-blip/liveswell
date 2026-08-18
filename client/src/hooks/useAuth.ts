import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const DEMO_USER = { id: "demo", username: "LiveSwell", firstName: "Demo" };

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("demo");
}

/** True when Clerk has written a session to localStorage but hasn't hydrated yet.
 *  Only used when Clerk has NOT finished loading — once isLoaded=true Clerk's
 *  own isLoaded flag is authoritative and we stop relying on the localStorage key.
 */
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

  // Fetch Pro subscription status. Cached for 5 min; only runs when authenticated.
  const { data: subData, isLoading: isSubLoading } = useQuery<{ isPro: boolean }>({
    queryKey: ["/api/whop/subscription"],
    enabled: !demo && isLoaded && !!clerkUser,
    staleTime: 5 * 60 * 1000,
    retry: 1,
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
      isPro: false,
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

  // Keep the spinner up ONLY while Clerk is still initialising (!isLoaded).
  // Once Clerk reports isLoaded=true its verdict on clerkUser is authoritative:
  //   - clerkUser set   → authenticated
  //   - clerkUser null  → not authenticated (expired JWT, no session, etc.)
  // The previous `sessionRestorePending` guard checked localStorage for a
  // __clerk_db_jwt key even after isLoaded=true, which caused a permanent
  // spinner whenever a stored JWT was expired or invalid (no recovery path).
  // isProLoading is true while Clerk is ready but the Whop subscription
  // check hasn't resolved yet — consumers should show a neutral skeleton
  // rather than flashing "Free" during this window.
  const isProLoading = isLoaded && !!clerkUser && isSubLoading;

  return {
    user,
    isLoading: !isLoaded,
    isAuthenticated: !!clerkUser,
    isPro: subData?.isPro ?? false,
    isProLoading,
    logout,
  };
}
