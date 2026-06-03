import { Link, useLocation } from "wouter";
import { Waves, User, Search } from "lucide-react";

const tabs = [
  { label: "Spots",   icon: Waves,  href: "/" },
  { label: "Search",  icon: Search, href: "/?search=1", isSearch: true },
  { label: "Profile", icon: User,   href: "/profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  const isActive = (href: string, isSearch?: boolean) => {
    if (isSearch) return false;
    if (href === "/") return location === "/" || location === "/conditions";
    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-lg mx-3 mb-3 rounded-2xl px-2 py-2 flex items-center justify-around"
        style={{ background: "rgba(3,10,20,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        {tabs.map(({ label, icon: Icon, href, isSearch }) => {
          const active = isActive(href, isSearch);
          return (
            <Link key={label} href={href}>
              <button
                className="flex flex-col items-center gap-0.5 px-8 py-1.5 rounded-xl transition-all"
                style={{
                  background: active ? "rgba(16,185,129,0.12)" : "transparent",
                }}
              >
                {isSearch ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #34d399, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(52,211,153,0.35)",
                    marginBottom: 2,
                  }}>
                    <Icon size={18} style={{ color: "#030a14" }} />
                  </div>
                ) : (
                  <Icon size={20} style={{ color: active ? "#34d399" : "#475569" }} />
                )}
                <span className="text-[10px] font-semibold" style={{ color: isSearch ? "#34d399" : active ? "#34d399" : "#475569" }}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
