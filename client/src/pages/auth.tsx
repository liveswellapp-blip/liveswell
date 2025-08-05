import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthContext";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";
import { Card, CardContent } from "@/components/ui/card";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-emerald-900 flex flex-col">
      {/* Header */}
      <div className="w-full bg-black/30 backdrop-blur-sm border-b border-emerald-800/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-12">
              <img 
                src={logoImageDark} 
                alt="LiveSwell" 
                className="h-12 object-contain object-center"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="flex items-start md:items-center justify-center flex-1 p-4 pt-12 md:pt-4">
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
      <div className="bg-black text-center py-6 text-white/70">
        <p className="text-sm">
          Real-time surf conditions and forecasts for surfers worldwide
        </p>
      </div>
    </div>
  );
}