import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
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
import AdminDashboard from "@/pages/admin";
import AdminUserDetail from "@/pages/admin-user-detail";
import NotificationSettings from "@/pages/NotificationSettings";
import SurfAgentChat from "@/components/SurfAgentChat";
import SupportHome from "@/pages/support/index";
import SupportCategory from "@/pages/support/category";

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

        {/* Public info pages */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/support" component={SupportHome} />
        <Route path="/support/category/:slug" component={SupportCategory} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users/:userId" component={AdminUserDetail} />

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
          <Route component={Landing} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
