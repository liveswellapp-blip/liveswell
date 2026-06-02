import { Waves, Wind, Bell, LogOut, Shield, ChevronRight, MapPin, Star, Activity } from "lucide-react";

const STATS = [
  { label: "Saved Spots", value: "7", icon: MapPin, color: "text-emerald-400" },
  { label: "Sessions", value: "34", icon: Activity, color: "text-cyan-400" },
  { label: "Alerts Set", value: "3", icon: Bell, color: "text-amber-400" },
];

const ROWS = [
  { icon: Bell, label: "Notifications", sub: "SMS & email alerts", color: "text-amber-400", accent: "#f59e0b" },
  { icon: Shield, label: "Account Security", sub: "Session & access", color: "text-sky-400", accent: "#38bdf8" },
  { icon: Waves, label: "Wave Preferences", sub: "Units & thresholds", color: "text-emerald-400", accent: "#34d399" },
  { icon: Wind, label: "Wind Settings", sub: "Alert conditions", color: "text-cyan-400", accent: "#22d3ee" },
];

export default function OceanStats() {
  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto" style={{ background: "#030a14" }}>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden px-5 pt-8 pb-6"
        style={{ background: "linear-gradient(160deg,#022c22 0%,#041a2e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 390 160" preserveAspectRatio="none">
          {[0, 20, 40].map(o => (
            <path key={o} d={`M0 ${80 + o} Q97 ${70 + o} 195 ${80 + o} T390 ${80 + o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />
          ))}
        </svg>
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#065f46,#0c4a6e)", border: "2px solid rgba(52,211,153,0.4)" }}>
            JS
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
              <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">LiveSwell</span>
            </div>
            <h1 className="text-white font-black text-xl leading-tight">John Surfer</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">john@example.com</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon size={14} className={`${color} mx-auto mb-1`} />
              <p className="text-white text-[18px] font-black leading-none">{value}</p>
              <p className="text-slate-600 text-[9px] mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="px-4 pt-5 pb-8 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Settings</span>
        </div>

        {ROWS.map(({ icon: Icon, label, sub, color, accent }) => (
          <div key={label}
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 cursor-pointer"
            style={{ background: "linear-gradient(160deg,#030f1c,#041a2e)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon size={14} className={color} />
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold leading-tight">{label}</p>
                <p className="text-slate-600 text-[10px]">{sub}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-700" />
          </div>
        ))}

        {/* Sign out */}
        <div className="mt-4 rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <LogOut size={14} className="text-red-400" />
            </div>
            <p className="text-red-400 text-[13px] font-semibold">Sign Out</p>
          </div>
        </div>

        <p className="text-center text-slate-700 text-[10px] pt-2">LiveSwell v1.0.0</p>
      </div>
    </div>
  );
}
