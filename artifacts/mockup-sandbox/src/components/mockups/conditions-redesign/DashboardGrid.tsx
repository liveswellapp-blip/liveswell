import { Waves, Wind, BarChart3, Droplets, Sun, MapPin, Bot, ChevronRight, Radio, Clock, Heart } from "lucide-react";

const stats = [
  { icon: Waves,    label: "Wave Height",  value: "4–5 ft",      sub: "WSW swell",              color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
  { icon: Wind,     label: "Wind",         value: "5 mph N",     sub: "Offshore ↗",             color: "text-sky-400",     border: "border-sky-500/20",     bg: "bg-sky-500/8" },
  { icon: Waves,    label: "Wave Period",  value: "17 sec",      sub: "Long-period groundswell", color: "text-teal-400",    border: "border-teal-500/20",    bg: "bg-teal-500/8" },
  { icon: BarChart3,label: "Tide",         value: "Rising",      sub: "+1.2 ft · High 2:20 PM",  color: "text-cyan-400",    border: "border-cyan-500/20",    bg: "bg-cyan-500/8" },
  { icon: Droplets, label: "Water Temp",   value: "58°F / 14°C", sub: "Sea surface (NOAA buoy)", color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/8" },
  { icon: Sun,      label: "UV Index",     value: "6",           sub: "High — use SPF 30+",      color: "text-amber-400",   border: "border-amber-500/20",   bg: "bg-amber-500/8" },
];

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

export function DashboardGrid() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Location hero — from Design C */}
      <div className="mx-3 mt-1 rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 50%, #0c2340 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 370 130" preserveAspectRatio="none">
          {[0,22,44].map(o => <path key={o} d={`M0 ${65+o} Q90 ${50+o} 185 ${65+o} T370 ${65+o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />)}
        </svg>
        <div className="relative px-5 pt-4 pb-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold">Half Moon Bay, CA</span>
              </div>
              <h2 className="text-white font-black text-2xl">Mavericks</h2>
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
          <div className="flex items-center gap-2 mt-2.5 pb-2">
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">N Wind · Offshore</span>
            <span className="bg-slate-700/60 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">WSW Swell</span>
            <span className="bg-cyan-500/15 text-cyan-400 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-cyan-500/25">Tide Rising</span>
          </div>
        </div>
      </div>

      {/* 2-col stat grid */}
      <div className="grid grid-cols-2 gap-2 mx-3 mt-2">
        {stats.map(({ icon: Icon, label, value, sub, color, border, bg }) => (
          <div key={label} className={`${bg} ${border} border rounded-xl p-3 flex items-start gap-2.5`}>
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-[10px] font-medium leading-tight">{label}</p>
              <p className={`font-bold text-sm ${color} leading-snug`}>{value}</p>
              <p className="text-slate-500 text-[10px] leading-tight truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buoy sources */}
      <div className="mx-3 mt-2 bg-slate-800/50 rounded-xl border border-white/8 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Radio className="h-3 w-3 text-slate-500" />
          <span className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Live Data Sources — NOAA NDBC</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2.5 border border-emerald-500/15">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-semibold">Primary</span>
            </div>
            <p className="text-white text-[11px] font-semibold leading-tight">Point Reyes, CA</p>
            <p className="text-slate-400 text-[9px]">Station 46237</p>
            <div className="flex flex-col mt-1 gap-0.5">
              <p className="text-slate-300 text-[9px]">4.5ft · 17s · WSW</p>
              <p className="text-slate-300 text-[9px]">Water: 58°F</p>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-slate-500 text-[9px]">4 min ago</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 border border-sky-500/15">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-sky-400 text-[10px] font-semibold">Backup</span>
            </div>
            <p className="text-white text-[11px] font-semibold leading-tight">Half Moon Bay</p>
            <p className="text-slate-400 text-[9px]">Station 46012</p>
            <div className="flex flex-col mt-1 gap-0.5">
              <p className="text-slate-300 text-[9px]">4.1ft · 16s · W</p>
              <p className="text-slate-300 text-[9px]">Water: 57°F</p>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-slate-500 text-[9px]">11 min ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast strip */}
      <div className="mx-3 mt-2 bg-slate-800/60 rounded-xl border border-white/8 p-3">
        <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">5-Day Forecast</p>
        <div className="flex justify-between">
          {forecast.map(({ day, wave, period, wind, dir }) => (
            <div key={day} className="flex flex-col items-center gap-0.5">
              <span className="text-slate-400 text-[10px]">{day}</span>
              <span className="text-white font-bold text-[11px]">{wave}</span>
              <span className="text-teal-400 text-[9px]">{period}</span>
              <span className="text-slate-400 text-[9px]">{wind}</span>
              <span className={`text-[9px] font-semibold ${dir === "Offshore" ? "text-emerald-400" : "text-amber-400"}`}>{dir}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
