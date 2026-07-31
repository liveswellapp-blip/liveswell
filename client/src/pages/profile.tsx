import { Bell, LogOut, Shield, ChevronRight, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

function getInitials(user: any): string {
  const name = user?.firstName || user?.name || user?.username || "";
  const email = user?.email || "";
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase() || "??";
}

function getDisplayName(user: any): string {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
  if (user?.firstName) return user.firstName;
  if (user?.name) return user.name;
  if (user?.username) return user.username;
  return "Surfer";
}

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const initials = getInitials(user);
  const displayName = getDisplayName(user);
  const email = (user as any)?.email || "";

  const ITEMS = [
    { icon: Bell,     label: "Notifications", value: "Manage alerts", color: "#fbbf24", href: "/notifications" },
    { icon: Settings, label: "Preferences",   value: "",              color: "#94a3b8", href: "/settings" },
    { icon: Shield,   label: "Privacy",        value: "",              color: "#38bdf8", href: "/privacy" },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen flex flex-col pb-6" style={{ background: "#030a14" }}>
      <Header />
      <div className="px-5 pt-6 pb-6"
        style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 select-none"
              style={{ background: "linear-gradient(135deg,#065f46,#0c4a6e)", border: "2px solid rgba(52,211,153,0.35)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight">{displayName}</h1>
              {email && <p className="text-slate-600 text-[11px] mt-0.5 truncate">{email}</p>}
            </div>
          </div>

          <div className="mt-5" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>
      </div>

      {/* ── Menu list ── */}
      <main className="flex-1 px-5 pb-8 max-w-lg mx-auto w-full">
        <div className="space-y-1">
          {ITEMS.map(({ icon: Icon, label, value, color, href }) => {
            const row = (
              <div className="flex items-center justify-between px-1 py-3.5 cursor-pointer"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-white text-[13px] font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {value ? <span className="text-slate-600 text-[11px]">{value}</span> : null}
                  <ChevronRight size={13} className="text-slate-700" />
                </div>
              </div>
            );

            return (
              <div key={label}>
                {href ? <Link href={href}>{row}</Link> : row}
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <div className="pt-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-1 py-3.5 rounded-xl"
            style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <LogOut size={14} className="text-red-400" />
            </div>
            <span className="text-red-400 text-[13px] font-medium">Sign Out</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
