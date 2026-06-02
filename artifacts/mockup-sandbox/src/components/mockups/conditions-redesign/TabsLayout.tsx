import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, ChevronLeft, Heart, Radio, Clock, Activity } from "lucide-react";
import { useState } from "react";

const TABS = ["Now", "Forecast", "Tides", "Sources"] as const;
type Tab = typeof TABS[number];

const forecast = [
  { day: "Monday",    wave: "4–5 ft", period: "17s", wind: "5 mph",  dir: "N",  windType: "Offshore" },
  { day: "Tuesday",   wave: "3–4 ft", period: "14s", wind: "8 mph",  dir: "NW", windType: "Offshore" },
  { day: "Wednesday", wave: "5–6 ft", period: "18s", wind: "4 mph",  dir: "N",  windType: "Offshore" },
  { day: "Thursday",  wave: "2–3 ft", period: "12s", wind: "12 mph", dir: "SW", windType: "Onshore"  },
  { day: "Friday",    wave: "3 ft",   period: "11s", wind: "9 mph",  dir: "S",  windType: "Onshore"  },
];

const tideEvents = [
  { time: "2:20 AM", type: "Low",  height: "1.2 ft" },
  { time: "8:45 AM", type: "High", height: "5.8 ft" },
  { time: "3:10 PM", type: "Low",  height: "0.8 ft" },
  { time: "9:30 PM", type: "High", height: "4.9 ft" },
];

const buoys = [
  {
    role: "Primary",      dot: "bg-emerald-400", border: "border-emerald-500/20", label: "text-emerald-400",
    name: "Point Reyes, CA", id: "46237", dist: "18 mi offshore",
    wave: "4.5 ft", period: "17s", dir: "WSW", water: "58°F", wind: "5 mph NW", updated: "4 min ago", quality: "Excellent",
  },
  {
    role: "Backup",       dot: "bg-sky-400",     border: "border-sky-500/20",     label: "text-sky-400",
    name: "Half Moon Bay", id: "46012", dist: "6 mi offshore",
    wave: "4.1 ft", period: "16s", dir: "W",   water: "57°F", wind: "4 mph N",  updated: "11 min ago", quality: "Good",
  },
];

function TideCurve() {
  const pts = [[0,55],[40,58],[80,50],[120,28],[160,42],[200,60],[240,65],[280,48],[320,30]].map(([x,y]) => `${x},${y}`);
  const path = `M ${pts.join(" L ")}`;
  return (
    <svg width="100%" height="68" viewBox="0 0 320 68" preserveAspectRatio="none">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0" /></linearGradient></defs>
      <path d={`${path} L 320,68 L 0,68 Z`} fill="url(#tg)" />
      <path d={path} stroke="#06b6d4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TabsLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("Now");

  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Header */}
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

      {/* Primary data strip */}
      <div className="mx-3 bg-slate-800/70 rounded-xl border border-white/8 px-4 py-2.5 flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-emerald-400 font-black text-2xl">4–5</span>
          <span className="text-slate-400 text-sm font-semibold">ft</span>
          <span className="text-slate-500 text-xs ml-1">@ 17s</span>
        </div>
        <div className="h-5 w-px bg-slate-600" />
        <div className="flex items-baseline gap-1">
          <span className="text-sky-400 font-black text-2xl">5</span>
          <span className="text-slate-400 text-sm font-semibold">mph</span>
          <span className="text-emerald-400 text-xs font-semibold ml-1">Offshore</span>
        </div>
        <div className="h-5 w-px bg-slate-600" />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[10px]">Station 46237</span>
        </div>
      </div>

      {/* Tabs — replaced AI with Sources */}
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
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8">
                <div className="flex items-center gap-1.5 mb-1"><Waves className="h-3.5 w-3.5 text-emerald-400" /><span className="text-slate-400 text-xs">Swell</span></div>
                <p className="text-emerald-400 font-black text-2xl leading-none">4–5 <span className="text-sm text-slate-400 font-semibold">ft</span></p>
                <p className="text-slate-400 text-xs">WSW direction</p>
                <p className="text-teal-400 text-xs font-semibold">17-second period</p>
              </div>
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8">
                <div className="flex items-center gap-1.5 mb-1"><Wind className="h-3.5 w-3.5 text-sky-400" /><span className="text-slate-400 text-xs">Wind</span></div>
                <p className="text-sky-400 font-black text-2xl leading-none">5 <span className="text-sm text-slate-400 font-semibold">mph</span></p>
                <p className="text-slate-400 text-xs">Due North (360°)</p>
                <p className="text-emerald-400 text-xs font-semibold">Offshore</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Droplets, label: "Water",  value: "58°F",    sub: "14°C",    color: "text-cyan-400" },
                { icon: Sun,      label: "UV",      value: "6",       sub: "High",    color: "text-amber-400" },
                { icon: BarChart3,label: "Tide",    value: "+1.2 ft", sub: "Rising",  color: "text-cyan-400" },
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
            <div className="bg-emerald-900/25 rounded-xl border border-emerald-500/20 p-3 flex gap-2">
              <Bot className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 text-xs leading-relaxed">Overhead sets from the NW on a long 17s period. North winds offshore through morning — sea breeze fills SW around midday.</p>
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

        {activeTab === "Sources" && (
          <div className="space-y-3">
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wide">NOAA NDBC Network</span>
              </div>
              <p className="text-slate-500 text-xs">National Data Buoy Center — 1,355 active stations</p>
              <p className="text-slate-500 text-xs mt-0.5">10 stations within 150 miles · data quality: excellent</p>
            </div>

            {buoys.map((b) => (
              <div key={b.id} className={`bg-slate-800/60 rounded-2xl border ${b.border} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${b.dot}`} />
                    <span className={`text-xs font-bold ${b.label}`}>{b.role} Buoy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-slate-500" />
                    <span className="text-slate-500 text-[10px]">{b.updated}</span>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm">{b.name}</p>
                <p className="text-slate-400 text-xs mb-2">Station {b.id} · {b.dist}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-slate-500 text-[9px]">Waves</p>
                    <p className="text-emerald-400 font-bold text-xs">{b.wave}</p>
                    <p className="text-teal-400 text-[9px]">@ {b.period}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-slate-500 text-[9px]">Direction</p>
                    <p className="text-slate-300 font-bold text-xs">{b.dir}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-slate-500 text-[9px]">Water</p>
                    <p className="text-cyan-400 font-bold text-xs">{b.water}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/8">
                  <span className="text-slate-500 text-[10px]">Wind: <span className="text-slate-300">{b.wind}</span></span>
                  <span className="text-slate-500 text-[10px]">Quality: <span className="text-emerald-400 font-semibold">{b.quality}</span></span>
                </div>
              </div>
            ))}

            <div className="bg-slate-800/60 rounded-xl border border-white/8 p-3">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">Other Sources</p>
              <div className="space-y-1.5">
                {[
                  { name: "OpenWeatherMap", fields: "Wind speed, gusts, atmospheric data" },
                  { name: "NOAA Tides & Currents", fields: "Tide predictions, water levels" },
                  { name: "Open-Meteo Marine", fields: "5-day wave forecast" },
                ].map(({ name, fields }) => (
                  <div key={name} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-300 text-[11px] font-semibold">{name}</p>
                      <p className="text-slate-500 text-[10px]">{fields}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
