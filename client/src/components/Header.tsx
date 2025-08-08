import { User, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

export default function Header() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="bg-background shadow-lg sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-48 h-12">
              {/* Dark mode logo only */}
              <img 
                src={logoImageDark} 
                alt="LiveSwell" 
                className="h-12 object-contain object-left"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
          
          {/* User account section */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="text-white hover:text-gray-200" title="User Account">
                  <User className="h-6 w-6" />
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white hover:text-gray-900"
                data-testid="button-open-auth"
                onClick={() => window.location.href = "/api/login"}
              >
                <LogIn className="h-4 w-4 mr-1" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
