import { User, LogOut, LogIn, Search, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import SearchModal from "./SearchModal";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

interface HeaderProps {
  onLocationSelect?: (location: any) => void;
}

export default function Header({ onLocationSelect }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [showSearchModal, setShowSearchModal] = useState(false);

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
          
          {/* Navigation icons for conditions page */}
          {location === "/conditions" && (
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearchModal(true)}
                className="text-white hover:text-gray-200"
                title="Search surf spots"
                data-testid="button-search"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-gray-200"
                  title="Browse surf spots"
                  data-testid="button-surf-spots"
                >
                  <Waves className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}
          
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
      
      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onLocationSelect={(location) => {
          if (onLocationSelect) onLocationSelect(location);
          setShowSearchModal(false);
        }}
        initialQuery=""
      />
    </header>
  );
}
