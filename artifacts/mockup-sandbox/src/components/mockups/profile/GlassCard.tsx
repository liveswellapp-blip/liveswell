import { Bell, LogOut, Shield, ChevronRight, Waves, Wind, Heart, Star } from "lucide-react";

const MENU = [
  {
    section: "Account",
    items: [
      { icon: Bell,   label: "Notifications",    sub: "Alerts & updates",    color: "#fbbf24" },
      { icon: Heart,  label: "Saved Spots",       sub: "7 locations saved",   color: "#34d399" },
      { icon: Star,   label: "Preferences",       sub: "Units & display",     color: "#818cf8" },
    ],
  },
  {
    section: "Security",
    items: [
      { icon: Shield, label: "Account & Privacy", sub: "Manage access",       color: "#38bdf8" },
    ],
  },
];

export default function GlassCard() {
  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto" style={{ background: "#030a14" }}>

      {/* ── Full-bleed hero ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#022c22 0%,#0c2340 100%)", minHeight: 220 }}>

        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#34d399,transparent 70%)" }} />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle,#22d3ee,transparent 70%)" }} />

        {/* LiveSwell label */}
        <div className="relative px-5 pt-6 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">LiveSwell</span>
        </div>

        {/* Avatar centered */}
        <div className="relative flex flex-col items-center pt-5 pb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3"
            style={{
              background: "linear-gradient(135deg,#065f46,#0c4a6e)",
              border: "3px solid rgba(52,211,153,0.5)",
              boxShadow: "0 0 24px rgba(52,211,153,0.2)",
            }}>
            JS
          </div>
          <h1 className="text-white font-black text-xl">John Surfer</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">john@example.com</p>

          {/* Member badge */}
          <div className="mt-3 px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Waves size={9} className="text-emerald-400" />
            <span className="text-emerald-400 text-[9px] font-bold tracking-wider uppercase">Pro Surfer</span>
          </div>
        </div>
      </div>

      {/* ── Quick stats strip ── */}
      <div className="mx-4 -mt-4 rounded-2xl px-4 py-3 flex items-center justify-around relative z-10"
        style={{ background: "rgba(4,26,46,0.95)", border: "1px solid rgba(52,211,153,0.15)", backdropFilter: "blur(12px)" }}>
        {[["7", "Saved"], ["34", "Sessions"], ["3", "Alerts"]].map(([v, l]) => (
          <div key={l} className="text-center">
            <p className="text-emerald-400 text-[18px] font-black leading-none">{v}</p>
            <p className="text-slate-600 text-[9px] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* ── Menu sections ── */}
      <div className="px-4 pt-5 pb-8 space-y-4">
        {MENU.map(({ section, items }) => (
          <div key={section}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-slate-600 text-[10px] font-bold tracking-widest uppercase">{section}</span>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {items.map(({ icon: Icon, label, sub, color }, i) => (
                <div key={label}>
                  {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />}
                  <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
                    style={{ background: "linear-gradient(160deg,#030f1c,#041a2e)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}15`, border: `1px solid ${color}28` }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-white text-[13px] font-semibold leading-tight">{label}</p>
                        <p className="text-slate-600 text-[10px]">{sub}</p>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.18)" }}>
          <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
            style={{ background: "rgba(239,68,68,0.05)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <LogOut size={13} className="text-red-400" />
            </div>
            <p className="text-red-400 text-[13px] font-semibold">Sign Out</p>
          </div>
        </div>

        <p className="text-center text-slate-700 text-[10px]">LiveSwell v1.0.0</p>
      </div>
    </div>
  );
}
