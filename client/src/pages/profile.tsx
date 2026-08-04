import { useState } from "react";
import { Bell, LogOut, Shield, ChevronRight, Settings, HelpCircle, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
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

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl text-[13px] text-white bg-transparent outline-none"
          style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const initials = getInitials(user);
  const displayName = getDisplayName(user);
  const email = (user as any)?.email || "";

  // Change-password state
  const [pwExpanded, setPwExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPw === currentPw) {
      setPwError("New password must be different from your current password.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.message || "Failed to update password.");
      } else {
        setPwSuccess(true);
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        // Collapse after 2 seconds
        setTimeout(() => {
          setPwSuccess(false);
          setPwExpanded(false);
        }, 2000);
      }
    } catch {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setPwLoading(false);
    }
  };

  const ITEMS = [
    { icon: Bell,        label: "Notifications", value: "Manage alerts", color: "#fbbf24", href: "/notifications" },
    { icon: Settings,    label: "Preferences",   value: "",              color: "#94a3b8", href: "/settings" },
    { icon: Shield,      label: "Privacy",        value: "",              color: "#38bdf8", href: "/privacy" },
    { icon: HelpCircle,  label: "Help & Support", value: "",              color: "#34d399", href: "/support" },
  ];

  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
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

          {/* ── Change password ── */}
          <div>
            <button
              type="button"
              onClick={() => {
                setPwExpanded((v) => !v);
                setPwError("");
                setPwSuccess(false);
              }}
              className="w-full flex items-center justify-between px-1 py-3.5 cursor-pointer"
              style={{ borderBottom: pwExpanded ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
                  <Lock size={14} style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-white text-[13px] font-medium">Change Password</span>
              </div>
              <ChevronRight
                size={13}
                className="text-slate-700 transition-transform duration-200"
                style={{ transform: pwExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>

            {pwExpanded && (
              <div
                className="mb-2 px-3 pt-3 pb-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {pwSuccess ? (
                  <div className="flex items-center gap-2 py-2 px-1">
                    <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-[13px] font-medium">Password updated successfully.</span>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <PasswordField
                      id="current-pw"
                      label="Current password"
                      value={currentPw}
                      onChange={setCurrentPw}
                      placeholder="Enter current password"
                    />
                    <PasswordField
                      id="new-pw"
                      label="New password"
                      value={newPw}
                      onChange={setNewPw}
                      placeholder="At least 8 characters"
                    />
                    <PasswordField
                      id="confirm-pw"
                      label="Confirm new password"
                      value={confirmPw}
                      onChange={setConfirmPw}
                      placeholder="Repeat new password"
                    />

                    {pwError && (
                      <p className="text-red-400 text-[12px] px-1">{pwError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                      className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#6d28d9,#4f46e5)" }}>
                      {pwLoading ? "Updating…" : "Update Password"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
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
