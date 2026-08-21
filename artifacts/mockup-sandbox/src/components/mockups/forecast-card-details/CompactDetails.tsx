import { ChevronDown, ChevronUp, Sunrise, Sunset, Waves, Wind } from "lucide-react";
import { useState } from "react";
import "./_group.css";

const day = {
  date: "Tomorrow",
  icon: "🌤️",
  conditions: "Fair, building swell",
  waveHeight: "3–4 ft",
  wavePeriod: "10 sec",
  windSpeed: "9 mph",
  windDirection: "NW",
  sunrise: "6:22 AM",
  sunset: "8:15 PM",
  tides: [
    { type: "High tide", time: "4:02 AM", height: "3.9 ft" },
    { type: "Low tide", time: "10:28 AM", height: "0.3 ft" },
    { type: "High tide", time: "4:38 PM", height: "3.6 ft" },
    { type: "Low tide", time: "10:51 PM", height: "0.5 ft" },
  ],
};

function TideChartPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-slate-950">
      <div className="relative h-[120px] overflow-hidden">
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="compact-tide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 62 C28 24 60 25 88 64 S146 105 178 57 S238 16 268 58 S306 95 320 70 L320 120 L0 120 Z" fill="url(#compact-tide)" />
          <path d="M0 62 C28 24 60 25 88 64 S146 105 178 57 S238 16 268 58 S306 95 320 70" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      </div>
      <div className="h-6 px-3 flex items-center justify-between border-t border-white/[0.07] text-[8px] font-medium text-slate-500">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
      </div>
    </div>
  );
}

export function CompactDetails() {
  const [expanded, setExpanded] = useState(true);

  return (
    <main className="forecast-card-preview min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-[420px]">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Compact card + details</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-emerald-300/[0.38]" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
          <div className="flex items-center justify-between border-b border-white/5 px-4 pb-2.5 pt-3">
            <span className="text-sm font-bold text-emerald-400">{day.date}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.05] text-base">{day.icon}</span>
          </div>
          <div className="px-4 pb-3 pt-3">
            <p className="mb-3 truncate text-[11px] font-medium text-slate-400">{day.conditions}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-slate-500"><Waves size={12} /><span className="text-[10px] font-semibold uppercase tracking-wider">Wave</span></div>
                <p className="truncate text-[23px] font-black leading-none text-emerald-400">{day.waveHeight}</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">{day.wavePeriod}</p>
              </div>
              <div className="border-l border-white/[0.06] pl-3">
                <div className="mb-1 flex items-center gap-1.5 text-slate-500"><Wind size={12} /><span className="text-[10px] font-semibold uppercase tracking-wider">Wind</span></div>
                <p className="truncate text-[23px] font-bold leading-none text-cyan-400">{day.windSpeed}</p>
                <p className="mt-1 text-[12px] text-slate-400">{day.windDirection}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06]">
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="text-[11px] font-semibold text-emerald-300">{expanded ? "Hide details" : "More details"}</span>
              {expanded ? <ChevronUp size={15} className="text-emerald-300" /> : <ChevronDown size={15} className="text-emerald-300" />}
            </button>
            {expanded && (
              <div className="border-t border-white/[0.06] px-3 pb-3">
                <div className="grid grid-cols-2 gap-2 py-3">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.035] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Conditions</p><p className="mt-1 text-[12px] font-medium text-slate-200">{day.conditions}</p></div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.035] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Weather</p><p className="mt-1 text-[12px] font-medium text-slate-200">{day.icon} {day.conditions}</p></div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-300/[0.10] bg-amber-400/[0.06] px-3 py-2.5"><div className="flex items-center gap-1.5 text-amber-300/80"><Sunrise size={13} /><span className="text-[9px] font-semibold uppercase tracking-wider">Sunrise</span></div><p className="mt-1 text-[12px] font-medium text-slate-200">{day.sunrise}</p></div>
                  <div className="rounded-xl border border-orange-300/[0.10] bg-orange-400/[0.06] px-3 py-2.5"><div className="flex items-center gap-1.5 text-orange-300/80"><Sunset size={13} /><span className="text-[9px] font-semibold uppercase tracking-wider">Sunset</span></div><p className="mt-1 text-[12px] font-medium text-slate-200">{day.sunset}</p></div>
                </div>
                <p className="mb-2.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tides</p>
                <TideChartPreview />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {day.tides.map((tide) => <div key={tide.time} className="rounded-lg border border-white/[0.05] bg-white/[0.035] px-2.5 py-2"><p className={`text-[9px] font-semibold uppercase tracking-wider ${tide.type === "High tide" ? "text-emerald-300" : "text-sky-300"}`}>{tide.type}</p><p className="mt-0.5 text-[11px] text-slate-200">{tide.time}</p><p className="text-[10px] text-slate-500">{tide.height}</p></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-600">Short summaries make every day easy to scan; one tap reveals every forecast field for that day.</p>
      </div>
    </main>
  );
}