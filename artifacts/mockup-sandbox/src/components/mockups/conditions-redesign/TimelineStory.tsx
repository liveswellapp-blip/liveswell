import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, Heart, ChevronRight } from "lucide-react";

const hours = [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
const waveH = [3.5,4,4.5,5,5,4.5,4,3.5,3,3,2.5,2.5,3,3.5,4];
const windS = [3,4,5,5,5,6,7,8,10,12,11,10,9,8,7];
const windDir = ["N","N","N","N","N","N","NW","SW","SW","SW","S","S","SW","S","S"];
const tideH = [2,2.8,3.8,4.8,5.5,5.8,5.5,4.5,3.5,2.5,1.5,1.2,1.8,2.8,3.8];

const isOffshore = (d: string) => ["N","NE","NNE","NNW","NW"].includes(d);

const forecast = [
  { day: "Mon", wave: "4–5ft", period: "17s", wind: "5 N",   dir: "Offshore" },
  { day: "Tue", wave: "3–4ft", period: "14s", wind: "8 NW",  dir: "Offshore" },
  { day: "Wed", wave: "5–6ft", period: "18s", wind: "4 N",   dir: "Offshore" },
  { day: "Thu", wave: "2–3ft", period: "12s", wind: "12 SW", dir: "Onshore"  },
  { day: "Fri", wave: "3ft",   period: "11s", wind: "9 S",   dir: "Onshore"  },
];

const nearby = [
  { name: "Ocean Beach", dist: "3.2 mi", wave: "3–4ft" },
  { name: "Baker Beach",  dist: "5.1 mi", wave: "3ft" },
  { name: "Linda Mar",    dist: "8.4 mi", wave: "4ft" },
];

function HourlyBars({ values, colorFn }: { values: number[]; colorFn: (v: number, i: number) => string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-px h-8">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-[2px]"
          style={{ height: `${(v / max) * 32}px`, backgroundColor: colorFn(v, i) }} />
      ))}
    </div>
  );
}

export function TimelineStory() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero — location + key data */}
        <div className="mx-3 mt-1 rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 50%, #0c2340 100%)" }}>
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 370 130" preserveAspectRatio="none">
            {[0,22,44].map(o => <path key={o} d={`M0 ${65+o} Q90 ${50+o} 185 ${65+o} T370 ${65+o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />)}
          </svg>
          <div className="relative px-5 pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Half Moon Bay, CA</span>
                </div>
                <h2 className="text-white font-black text-2xl">Mavericks</h2>
                <p className="text-slate-400 text-xs mt-0.5">Updated 4 min ago</p>
              </div>
              <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-slate-300" />
              </button>
            </div>

            {/* 4-up stats */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Height</p>
                <p className="text-emerald-400 font-black text-lg leading-tight">4–5<span className="text-xs font-semibold text-slate-400"> ft</span></p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Period</p>
                <p className="text-teal-400 font-black text-lg leading-tight">17<span className="text-xs font-semibold text-slate-400"> s</span></p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Wind</p>
                <p className="text-sky-400 font-black text-lg leading-tight">5<span className="text-xs font-semibold text-slate-400"> mph</span></p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Water</p>
                <p className="text-cyan-400 font-black text-lg leading-tight">58<span className="text-xs font-semibold text-slate-400"> °F</span></p>
              </div>
            </div>

            {/* Wind direction tag */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">N Wind · Offshore</span>
              <span className="bg-slate-700/60 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">WSW Swell</span>
              <span className="bg-cyan-500/15 text-cyan-400 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-cyan-500/25">Tide Rising</span>
            </div>
          </div>
        </div>

        {/* Hourly chart */}
        <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-3">Today by Hour</p>

          <div className="mb-2">
            <div className="flex items-center gap-1 mb-1">
              <Waves className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-slate-500 text-[9px]">Wave Height (ft)</span>
            </div>
            <HourlyBars values={waveH} colorFn={(v) => v >= 4.5 ? "#10b981" : v >= 3.5 ? "#2dd4bf" : "#64748b"} />
          </div>

          <div className="mb-2 mt-2">
            <div className="flex items-center gap-1 mb-1">
              <Wind className="h-2.5 w-2.5 text-sky-400" />
              <span className="text-slate-500 text-[9px]">Wind Speed (mph) · green = offshore</span>
            </div>
            <HourlyBars values={windS} colorFn={(_, i) => isOffshore(windDir[i]) ? "#38bdf8" : "#f59e0b"} />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="h-2.5 w-2.5 text-cyan-400" />
              <span className="text-slate-500 text-[9px]">Tide Height (ft)</span>
            </div>
            <svg width="100%" height="28" viewBox="0 0 360 28" preserveAspectRatio="none">
              <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0" /></linearGradient></defs>
              {(() => {
                const pts = tideH.map((v, i) => `${(i/(tideH.length-1))*360},${28-(v/6)*24}`);
                return <>
                  <path d={`M ${pts.join(" L ")} L 360,28 L 0,28 Z`} fill="url(#tg)" />
                  <path d={`M ${pts.join(" L ")}`} stroke="#06b6d4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </>;
              })()}
            </svg>
          </div>

          {/* Hour labels */}
          <div className="flex mt-1.5">
            {hours.filter((_, i) => i % 5 === 0).map((h, i) => (
              <div key={h} className="flex-1 text-center">
                <span className="text-slate-600 text-[9px]">{h > 12 ? `${h-12}pm` : `${h}am`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sun + UV */}
        <div className="flex gap-2 mx-3 mt-2">
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <Sun className="h-3.5 w-3.5 text-amber-400 mb-1" />
            <p className="text-slate-400 text-[10px]">UV Index</p>
            <p className="text-amber-400 font-black text-xl">6</p>
            <p className="text-slate-500 text-[10px]">High</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <p className="text-slate-400 text-[10px] mb-1">Sunrise</p>
            <p className="text-amber-400 font-bold text-base">6:18 AM</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <p className="text-slate-400 text-[10px] mb-1">Sunset</p>
            <p className="text-orange-400 font-bold text-base">8:24 PM</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <Droplets className="h-3.5 w-3.5 text-cyan-400 mb-1" />
            <p className="text-slate-400 text-[10px]">Water</p>
            <p className="text-cyan-400 font-bold text-base">58°F</p>
          </div>
        </div>

        {/* AI summary */}
        <div className="mx-3 mt-2 bg-emerald-900/20 rounded-2xl border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">Conditions Summary</span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed">Overhead sets from the NW on a long 17-second period. North winds blowing offshore through the morning — sea breeze expected to shift SW around midday, bringing onshore wind.</p>
        </div>

        {/* 5-day forecast */}
        <div className="mx-3 mt-2 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">5-Day Forecast</p>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="space-y-2">
            {forecast.map(({ day, wave, period, wind, dir }) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-8">{day}</span>
                <span className="text-emerald-400 font-bold text-sm w-14">{wave}</span>
                <span className="text-teal-400 text-xs w-8">{period}</span>
                <span className="text-sky-400 text-xs flex-1">{wind} mph</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dir === "Offshore" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{dir}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby */}
        <div className="mx-3 mt-2 mb-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">Nearby Spots</p>
          <div className="space-y-1.5">
            {nearby.map(({ name, dist, wave }) => (
              <div key={name} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5 border border-white/6">
                <p className="text-white text-sm font-semibold">{name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">{dist}</span>
                  <span className="text-emerald-400 font-bold text-sm">{wave}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
