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
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
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
        {/* Auth pages — always accessible */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Public info pages */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/support" component={SupportHome} />
        <Route path="/support/category/:slug" component={SupportCategory} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users/:userId" component={AdminUserDetail} />

        {/* App routes — authenticated only */}
        {isLoading || !isAuthenticated ? (
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

        {(isLoading || !isAuthenticated) ? (
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
