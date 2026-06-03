import { Search } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import SearchModal from "./SearchModal";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

interface HeaderProps {
  onLocationSelect?: (location: any) => void;
}

export default function Header({ onLocationSelect }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [showSearchModal, setShowSearchModal] = useState(false);

  return (
    <header className="sticky top-0 z-50" style={{ background: "#030a14", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="mx-auto px-5 py-3 max-w-2xl flex items-center justify-between">
        <img
          src={logoImageDark}
          alt="LiveSwell"
          className="h-8 object-contain object-left"
        />

        <div className="flex items-center gap-1">
          {location === "/conditions" && isAuthenticated && (
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="Search surf spots"
              data-testid="button-search"
            >
              <Search size={15} />
            </button>
          )}

          {!isAuthenticated && (
            <button
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
              data-testid="button-open-auth"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onLocationSelect={(loc) => {
          if (onLocationSelect) onLocationSelect(loc);
          setShowSearchModal(false);
        }}
        initialQuery=""
      />
    </header>
  );
}
