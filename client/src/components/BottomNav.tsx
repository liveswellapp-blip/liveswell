import { Link, useLocation } from "wouter";
import { Waves, User } from "lucide-react";

const tabs = [
  { label: "Spots",   icon: Waves, href: "/" },
  { label: "Profile", icon: User,  href: "/profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "/conditions";
    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-lg mx-3 mb-3 rounded-2xl px-2 py-2 flex items-center justify-around"
        style={{ background: "rgba(3,10,20,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        {tabs.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Link key={label} href={href}>
              <button className="flex flex-col items-center gap-0.5 px-8 py-1.5 rounded-xl transition-colors"
                style={{ background: active ? "rgba(16,185,129,0.12)" : "transparent" }}>
                <Icon size={20} style={{ color: active ? "#34d399" : "#475569" }} />
                <span className="text-[10px] font-semibold" style={{ color: active ? "#34d399" : "#475569" }}>
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
