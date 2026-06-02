import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, ChevronLeft, Heart, ArrowRight } from "lucide-react";
import { useState } from "react";

const TABS = ["Now", "Forecast", "Tides", "AI Report"] as const;
type Tab = typeof TABS[number];

const forecast = [
  { day: "Monday",    wave: "4–5 ft", period: "17s", wind: "5 mph",  dir: "N", windType: "Offshore" },
  { day: "Tuesday",   wave: "3–4 ft", period: "14s", wind: "8 mph",  dir: "NW", windType: "Offshore" },
  { day: "Wednesday", wave: "5–6 ft", period: "18s", wind: "4 mph",  dir: "N",  windType: "Offshore" },
  { day: "Thursday",  wave: "2–3 ft", period: "12s", wind: "12 mph", dir: "SW", windType: "Onshore" },
  { day: "Friday",    wave: "3 ft",   period: "11s", wind: "9 mph",  dir: "S",  windType: "Onshore" },
];

const tideEvents = [
  { time: "2:20 AM", type: "Low",  height: "1.2 ft" },
  { time: "8:45 AM", type: "High", height: "5.8 ft" },
  { time: "3:10 PM", type: "Low",  height: "0.8 ft" },
  { time: "9:30 PM", type: "High", height: "4.9 ft" },
];

function TideCurve() {
  const pts = [
    [0,55],[40,58],[80,50],[120,28],[160,42],[200,60],[240,65],[280,48],[320,30]
  ].map(([x,y]) => `${x},${y}`);
  const path = `M ${pts.join(" L ")}`;
  return (
    <svg width="100%" height="68" viewBox="0 0 320 68" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 320,68 L 0,68 Z`} fill="url(#tg)" />
      <path d={path} stroke="#06b6d4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TabsLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("Now");

  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-base">Mavericks</p>
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className="h-3 w-3 text-slate-400" />
            <p className="text-slate-400 text-xs">Half Moon Bay, CA</p>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <Heart className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* Primary swell strip */}
      <div className="mx-3 bg-slate-800/70 rounded-xl border border-white/8 px-4 py-2.5 flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-emerald-400 font-black text-2xl">4–5</span>
          <span className="text-slate-400 text-sm font-semibold">ft</span>
          <span className="text-slate-500 text-xs ml-1">WSW @ 17s</span>
        </div>
        <div className="h-5 w-px bg-slate-600" />
        <div className="flex items-baseline gap-1">
          <span className="text-sky-400 font-black text-2xl">5</span>
          <span className="text-slate-400 text-sm font-semibold">mph</span>
          <span className="text-emerald-400 text-xs font-semibold ml-1">N · Offshore</span>
        </div>
        <div className="h-5 w-px bg-slate-600" />
        <div className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-cyan-400 font-semibold text-sm">Rising</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800/80 rounded-xl p-1 gap-0.5 mb-2">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? "bg-emerald-500 text-white" : "text-slate-400"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2">
        {activeTab === "Now" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8 space-y-0.5">
                <div className="flex items-center gap-1.5"><Waves className="h-3.5 w-3.5 text-emerald-400" /><span className="text-slate-400 text-xs">Swell</span></div>
                <p className="text-emerald-400 font-black text-2xl leading-none">4–5 <span className="text-sm text-slate-400 font-semibold">ft</span></p>
                <p className="text-slate-400 text-xs">WSW direction</p>
                <p className="text-teal-400 text-xs font-semibold">17-second period</p>
              </div>
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8 space-y-0.5">
                <div className="flex items-center gap-1.5"><Wind className="h-3.5 w-3.5 text-sky-400" /><span className="text-slate-400 text-xs">Wind</span></div>
                <p className="text-sky-400 font-black text-2xl leading-none">5 <span className="text-sm text-slate-400 font-semibold">mph</span></p>
                <p className="text-slate-400 text-xs">Due North (360°)</p>
                <p className="text-emerald-400 text-xs font-semibold">Offshore</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Droplets, label: "Water", value: "58°F", sub: "14°C", color: "text-cyan-400" },
                { icon: Sun,      label: "UV",    value: "6",    sub: "High", color: "text-amber-400" },
                { icon: BarChart3,label: "Tide",  value: "+1.2 ft",  sub: "Rising", color: "text-cyan-400" },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} className="bg-slate-800/70 rounded-xl p-3 border border-white/8 text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                  <p className={`font-bold text-sm ${color}`}>{value}</p>
                  <p className="text-slate-500 text-[10px]">{sub}</p>
                  <p className="text-slate-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-800/70 rounded-xl border border-white/8 p-3">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">Sun</p>
              <div className="flex justify-between items-center">
                <div className="text-center"><p className="text-amber-400 font-bold text-sm">6:18 AM</p><p className="text-slate-500 text-[10px]">Sunrise</p></div>
                <div className="flex-1 mx-3 h-0.5 bg-gradient-to-r from-amber-400/50 via-yellow-300/80 to-orange-400/50 rounded-full" />
                <div className="text-center"><p className="text-orange-400 font-bold text-sm">8:24 PM</p><p className="text-slate-500 text-[10px]">Sunset</p></div>
              </div>
            </div>
          </>
        )}

        {activeTab === "Forecast" && (
          <div className="space-y-2">
            {forecast.map(({ day, wave, period, wind, dir, windType }) => (
              <div key={day} className="bg-slate-800/60 rounded-xl p-3 border border-white/8">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-white font-semibold text-sm">{day}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${windType === "Offshore" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{windType}</span>
                </div>
                <div className="flex gap-4">
                  <div><p className="text-slate-500 text-[10px]">Waves</p><p className="text-emerald-400 font-bold text-sm">{wave}</p></div>
                  <div><p className="text-slate-500 text-[10px]">Period</p><p className="text-teal-400 font-bold text-sm">{period}</p></div>
                  <div><p className="text-slate-500 text-[10px]">Wind</p><p className="text-sky-400 font-bold text-sm">{wind} {dir}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Tides" && (
          <>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-3">Today's Tide</p>
              <TideCurve />
              <div className="flex justify-between mt-2">
                {["12a","3a","6a","9a","12p","3p","6p","9p"].map(t => (
                  <span key={t} className="text-slate-600 text-[9px]">{t}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tideEvents.map(({ time, type, height }) => (
                <div key={time} className={`rounded-xl p-3 border ${type === "High" ? "bg-cyan-900/25 border-cyan-500/25" : "bg-slate-800/60 border-white/8"}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${type === "High" ? "text-cyan-400" : "text-slate-400"}`}>{type} Tide</p>
                  <p className="text-white font-black text-xl mt-0.5">{height}</p>
                  <p className="text-slate-500 text-xs">{time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "AI Report" && (
          <div className="space-y-3">
            <div className="bg-emerald-900/25 rounded-2xl border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-3"><Bot className="h-4 w-4 text-emerald-400" /><span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Conditions Summary</span></div>
              <p className="text-slate-200 text-sm leading-relaxed">Solid overhead sets rolling in from the WNW at 4-5ft on a long 17-second period — groundswell energy from the open Pacific. Light north winds at 5mph are blowing offshore at this west-facing break, keeping wave faces clean and unaffected by chop.</p>
            </div>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Wind Classification</p>
              <p className="text-emerald-400 font-semibold text-sm">Offshore — North winds</p>
              <p className="text-slate-400 text-xs mt-1">At this west-facing break, north winds travel from land toward the ocean, keeping the face of each wave smooth and groomed.</p>
            </div>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Today's Window</p>
              <p className="text-white font-bold text-sm">7 AM – 10 AM</p>
              <p className="text-slate-400 text-xs mt-1">North winds hold through the morning. SW sea breeze typically fills in around midday, shifting conditions to onshore.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
