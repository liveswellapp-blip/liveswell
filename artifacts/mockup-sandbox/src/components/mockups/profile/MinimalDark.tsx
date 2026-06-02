import { Bell, LogOut, Shield, ChevronRight, Heart, Settings, Info, Moon } from "lucide-react";

const ITEMS = [
  { icon: Bell,     label: "Notifications",   value: "3 active",  color: "#fbbf24" },
  { icon: Heart,    label: "Saved Spots",      value: "7 spots",   color: "#34d399" },
  { icon: Settings, label: "Preferences",      value: "",          color: "#94a3b8" },
  { icon: Moon,     label: "Appearance",       value: "Dark",      color: "#818cf8" },
  { icon: Shield,   label: "Privacy",          value: "",          color: "#38bdf8" },
  { icon: Info,     label: "About",            value: "v1.0.0",    color: "#64748b" },
];

export default function MinimalDark() {
  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto" style={{ background: "#030a14" }}>

      {/* ── Slim header ── */}
      <div className="px-5 pt-8 pb-6"
        style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="flex items-center gap-1.5 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">LiveSwell</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#065f46,#0c4a6e)", border: "2px solid rgba(52,211,153,0.35)" }}>
            JS
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-[18px] leading-tight">John Surfer</h1>
            <p className="text-slate-600 text-[11px] mt-0.5 truncate">john@example.com</p>
          </div>
        </div>

        {/* Thin separator */}
        <div className="mt-5" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* ── Menu list ── */}
      <div className="px-4 pb-8 space-y-1">
        {ITEMS.map(({ icon: Icon, label, value, color }, i) => (
          <div key={label}>
            {i === 4 && (
              <div className="pt-3 pb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700" />
                <span className="text-slate-700 text-[10px] font-bold tracking-widest uppercase">More</span>
              </div>
            )}
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
          </div>
        ))}

        {/* Sign out — separate */}
        <div className="pt-5">
          <div className="flex items-center gap-3.5 px-1 py-3.5 cursor-pointer rounded-xl"
            style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <LogOut size={14} className="text-red-400" />
            </div>
            <span className="text-red-400 text-[13px] font-medium">Sign Out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
