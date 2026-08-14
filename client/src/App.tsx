import { Switch, Route, useLocation, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Sentry } from "./sentry";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import SurfSpots from "@/pages/surf-spots";
import Monitoring from "@/pages/monitoring";
import Landing from "@/pages/landing";
import ClerkSignIn from "@/pages/ClerkSignIn";
import ClerkSignUp from "@/pages/ClerkSignUp";
import SsoCallback from "@/pages/SsoCallback";
import AdminDashboard from "@/pages/admin";
import AdminUserDetail from "@/pages/admin-user-detail";
import NotificationSettings from "@/pages/NotificationSettings";
import SurfAgentChat from "@/components/SurfAgentChat";
import SupportHome from "@/pages/support/index";
import SupportCategory from "@/pages/support/category";
import PricingPage from "@/pages/Pricing";

// The set of routes that require authentication.
// When a signed-out user lands on one of these, we redirect them to
// /sign-in?redirect_url=<path> so Clerk can return them there after OAuth.
const PROTECTED_PATHS = ["/conditions", "/settings", "/notifications", "/profile", "/monitoring"];

function UnauthenticatedFallback() {
  const [location, navigate] = useLocation();
  // useSearch returns the raw query string (e.g. "?location=123" or "").
  const search = useSearch();
  const isProtected = PROTECTED_PATHS.some(
    (p) => location === p || location.startsWith(p + "/")
  );
  if (isProtected) {
    // Preserve the full destination: pathname + any query string.
    // e.g. /conditions?location=123 → /sign-in?redirect_url=%2Fconditions%3Flocation%3D123
    // Clerk's <SignIn> reads redirect_url and honours it after any OAuth flow
    // (Google, Apple, email, etc.) instead of falling back to "/".
    const fullPath = search ? `${location}?${search}` : location;
    const target = "/sign-in?redirect_url=" + encodeURIComponent(fullPath);
    // Use replace (history.replaceState) so the protected route is never pushed onto
    // the history stack.  Without this, pressing Back from /sign-in would return the
    // user to /settings → trigger this redirect again → loop back to /sign-in.
    // With replace: true the sequence is:
    //   previous page → /settings → (replaced by) /sign-in
    // so Back goes to "previous page", not back into the redirect loop.
    navigate(target, { replace: true });
    return null;
  }
  return <Landing />;
}

/** Keeps Sentry's user context in sync with the signed-in Clerk user. */
function SentryUserSync() {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      Sentry.setUser({ id: user.id, email: user.primaryEmailAddress?.emailAddress });
    } else {
      Sentry.setUser(null);
    }
  }, [user, isLoaded]);
  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <Switch>
        {/* Clerk auth pages */}
        <Route path="/sign-in" component={ClerkSignIn} />
        <Route path="/sign-up" component={ClerkSignUp} />
        {/* Keep /login as alias so old links still work */}
        <Route path="/login" component={ClerkSignIn} />
        <Route path="/register" component={ClerkSignUp} />
        {/* OAuth callbacks — Clerk appends /sso-callback to the component's `path`
            prop, so <SignIn path="/sign-in"> uses /sign-in/sso-callback and
            <SignUp path="/sign-up"> uses /sign-up/sso-callback.  All three are
            registered here so the AuthenticateWithRedirectCallback component can
            complete the session handshake regardless of which flow the user came from.
            These must appear before all auth-gated routes. */}
        <Route path="/sso-callback" component={SsoCallback} />
        <Route path="/sign-in/sso-callback" component={SsoCallback} />
        <Route path="/sign-up/sso-callback" component={SsoCallback} />

        {/* Public info pages */}
        <Route path="/pricing" component={PricingPage} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/support" component={SupportHome} />
        <Route path="/support/category/:slug" component={SupportCategory} />

        {/* Admin routes — deferred until Clerk session resolves so the
            catch-all loading spinner shows on hard refresh instead of
            flashing the admin login form while auth state is unknown. */}
        {!isLoading && <Route path="/admin" component={AdminDashboard} />}
        {!isLoading && <Route path="/admin/users/:userId" component={AdminUserDetail} />}

        {/* App routes — authenticated only */}
        {isLoading ? null : !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={SurfSpots} />
            <Route path="/conditions" component={Home} />
            <Route path="/settings" component={Settings} />
            <Route path="/notifications" component={NotificationSettings} />
            <Route path="/profile" component={Profile} />
            <Route path="/monitoring" component={Monitoring} />
          </>
        )}

        {isLoading ? (
          // Catch-all spinner: covers every route (/, /settings, /profile, /conditions, …)
          // while Clerk is restoring the session on hard refresh.
          <Route>
            {() => (
              <div style={{ minHeight: "100vh", background: "#030a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 32, height: 32, border: "3px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </Route>
        ) : !isAuthenticated ? (
          // Catch-all for unauthenticated users:
          // - "/" → show the landing page
          // - any protected route → redirect to /sign-in with the original path
          //   so Clerk can return the user there after OAuth (Google, Apple, etc.)
          <Route>
            {() => <UnauthenticatedFallback />}
          </Route>
        ) : (
          <Route component={NotFound} />
        )}
      </Switch>
      {isAuthenticated && <SurfAgentChat />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <SentryUserSync />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
