import { Search, Waves, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import SearchModal from "./SearchModal";
import logoImageDark from "@assets/Live_(1500_x_500_px)_(1)_1780500060904.png";

interface HeaderProps {
  onLocationSelect?: (location: any) => void;
}

export default function Header({ onLocationSelect }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [showSearchModal, setShowSearchModal] = useState(false);

  const spotsActive = location === "/" || location === "/conditions";
  const profileActive = location === "/profile";

  return (
    <header className="sticky top-0 z-50" style={{ background: "#030a14", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="mx-auto px-5 py-3 max-w-2xl flex items-center justify-between">
        <img
          src={logoImageDark}
          alt="LiveSwell"
          className="h-8 object-contain object-left"
        />

        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              {/* Spots */}
              <Link href="/">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: spotsActive ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                    color: spotsActive ? "#34d399" : "#475569",
                  }}
                  title="Surf spots"
                >
                  <Waves size={15} />
                </button>
              </Link>

              {/* Search */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}
                title="Search surf spots"
                data-testid="button-search"
              >
                <Search size={15} />
              </button>

              {/* Profile */}
              <Link href="/profile">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: profileActive ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                    color: profileActive ? "#34d399" : "#475569",
                  }}
                  title="Profile"
                >
                  <User size={15} />
                </button>
              </Link>
            </>
          ) : (
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
