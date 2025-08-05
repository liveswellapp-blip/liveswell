import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthContext";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";
import { Card, CardContent } from "@/components/ui/card";
import { Waves } from "lucide-react";

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleAuthSuccess = () => {
    setLocation("/");
  };

  const switchToRegister = () => {
    setAuthMode("register");
  };

  const switchToLogin = () => {
    setAuthMode("login");
  };

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-900">
      {/* Header */}
      <div className="w-full bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-white">
              <Waves className="h-8 w-8 text-emerald-400" />
              <h1 className="text-2xl font-bold">SurfCast</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          {authMode === "login" ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={switchToRegister}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-white/70">
        <p className="text-sm">
          Real-time surf conditions and forecasts for surfers worldwide
        </p>
      </div>
    </div>
  );
}