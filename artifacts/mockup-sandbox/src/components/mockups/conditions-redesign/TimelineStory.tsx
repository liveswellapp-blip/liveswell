import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, Heart, ChevronRight, Radio, Clock } from "lucide-react";

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
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
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
                {/* Live buoy badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400 text-[10px]">Stn 46237 · Point Reyes · 4 min ago</span>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-slate-300" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10">
              <div><p className="text-slate-400 text-[10px] uppercase tracking-wide">Height</p><p className="text-emerald-400 font-black text-lg leading-tight">4–5<span className="text-xs font-semibold text-slate-400"> ft</span></p></div>
              <div><p className="text-slate-400 text-[10px] uppercase tracking-wide">Period</p><p className="text-teal-400 font-black text-lg leading-tight">17<span className="text-xs font-semibold text-slate-400"> s</span></p></div>
              <div><p className="text-slate-400 text-[10px] uppercase tracking-wide">Wind</p><p className="text-sky-400 font-black text-lg leading-tight">5<span className="text-xs font-semibold text-slate-400"> mph</span></p></div>
              <div><p className="text-slate-400 text-[10px] uppercase tracking-wide">Water</p><p className="text-cyan-400 font-black text-lg leading-tight">58<span className="text-xs font-semibold text-slate-400"> °F</span></p></div>
            </div>

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
            <div className="flex items-center gap-1 mb-1"><Waves className="h-2.5 w-2.5 text-emerald-400" /><span className="text-slate-500 text-[9px]">Wave Height (ft)</span></div>
            <HourlyBars values={waveH} colorFn={(v) => v >= 4.5 ? "#10b981" : v >= 3.5 ? "#2dd4bf" : "#64748b"} />
          </div>
          <div className="mb-2 mt-2">
            <div className="flex items-center gap-1 mb-1"><Wind className="h-2.5 w-2.5 text-sky-400" /><span className="text-slate-500 text-[9px]">Wind (blue = offshore · amber = onshore)</span></div>
            <HourlyBars values={windS} colorFn={(_, i) => isOffshore(windDir[i]) ? "#38bdf8" : "#f59e0b"} />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1"><BarChart3 className="h-2.5 w-2.5 text-cyan-400" /><span className="text-slate-500 text-[9px]">Tide (ft)</span></div>
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
          <div className="flex mt-1.5">
            {hours.filter((_, i) => i % 5 === 0).map((h) => (
              <div key={h} className="flex-1 text-center">
                <span className="text-slate-600 text-[9px]">{h > 12 ? `${h-12}pm` : `${h}am`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buoy detail cards */}
        <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">NOAA Buoy Data</span>
            <span className="ml-auto text-slate-500 text-[10px]">10 stations nearby</span>
          </div>

          {/* Primary */}
          <div className="bg-slate-900/60 rounded-xl border border-emerald-500/20 p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-bold">PRIMARY · Stn 46237</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 text-slate-500" />
                <span className="text-slate-500 text-[9px]">4 min ago</span>
              </div>
            </div>
            <p className="text-white text-xs font-semibold mb-1.5">Point Reyes, CA — 18 mi offshore</p>
            <div className="flex gap-2">
              {[["Waves","4.5ft @ 17s","text-emerald-400"],["Direction","WSW","text-slate-300"],["Water","58°F / 14°C","text-cyan-400"],["Wind","5mph NW","text-sky-400"]].map(([l,v,c]) => (
                <div key={l} className="flex-1 bg-slate-800/80 rounded-lg p-1.5 text-center">
                  <p className="text-slate-500 text-[8px]">{l}</p>
                  <p className={`text-[9px] font-bold ${c}`}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Backup */}
          <div className="bg-slate-900/60 rounded-xl border border-sky-500/15 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-sky-400 text-[10px] font-bold">BACKUP · Stn 46012</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 text-slate-500" />
                <span className="text-slate-500 text-[9px]">11 min ago</span>
              </div>
            </div>
            <p className="text-white text-xs font-semibold mb-1.5">Half Moon Bay — 6 mi offshore</p>
            <div className="flex gap-2">
              {[["Waves","4.1ft @ 16s","text-emerald-400"],["Direction","W","text-slate-300"],["Water","57°F / 14°C","text-cyan-400"],["Wind","4mph N","text-sky-400"]].map(([l,v,c]) => (
                <div key={l} className="flex-1 bg-slate-800/80 rounded-lg p-1.5 text-center">
                  <p className="text-slate-500 text-[8px]">{l}</p>
                  <p className={`text-[9px] font-bold ${c}`}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sun + UV */}
        <div className="flex gap-2 mx-3 mt-2">
          {[
            { label: "UV Index", value: "6",       sub: "High",     icon: Sun,      color: "text-amber-400" },
            { label: "Sunrise",  value: "6:18 AM",  sub: "🌅",       icon: null,     color: "text-amber-400" },
            { label: "Sunset",   value: "8:24 PM",  sub: "🌇",       icon: null,     color: "text-orange-400" },
            { label: "Water",    value: "58°F",     sub: "14°C",     icon: Droplets, color: "text-cyan-400" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-2.5 text-center">
              {Icon && <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${color}`} />}
              <p className={`font-bold text-sm ${color}`}>{value}</p>
              <p className="text-slate-500 text-[9px]">{sub}</p>
              <p className="text-slate-500 text-[9px]">{label}</p>
            </div>
          ))}
        </div>

        {/* AI summary */}
        <div className="mx-3 mt-2 bg-emerald-900/20 rounded-2xl border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">Conditions Summary</span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed">Overhead sets from the NW on a long 17-second period — groundswell from the open Pacific. North winds at 5mph blowing offshore, keeping faces clean. Sea breeze expected to shift SW around midday.</p>
        </div>

        {/* 5-day */}
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
