import { Waves, Wind, BarChart3, Droplets, Sun, MapPin, ChevronRight, Clock, Heart } from "lucide-react";

const stats = [
  { icon: Waves,    label: "Wave Height",  value: "4–5 ft",      sub: "WSW swell",               color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
  { icon: Wind,     label: "Wind",         value: "5 mph N",     sub: "Offshore ↗",              color: "text-sky-400",     border: "border-sky-500/20",     bg: "bg-sky-500/8" },
  { icon: Waves,    label: "Wave Period",  value: "17 sec",      sub: "Long-period groundswell",  color: "text-teal-400",    border: "border-teal-500/20",    bg: "bg-teal-500/8" },
  { icon: BarChart3,label: "Tide",         value: "Rising",      sub: "+1.2 ft · High 2:20 PM",   color: "text-cyan-400",    border: "border-cyan-500/20",    bg: "bg-cyan-500/8" },
  { icon: Droplets, label: "Water Temp",   value: "58°F / 14°C", sub: "Sea surface (NOAA buoy)",  color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/8" },
  { icon: Sun,      label: "UV Index",     value: "6",           sub: "High — use SPF 30+",       color: "text-amber-400",   border: "border-amber-500/20",   bg: "bg-amber-500/8" },
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

      {/* Hero card — location + buoy data */}
      <div className="mx-3 mt-1 rounded-2xl relative"
        style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 50%, #0c2340 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10 rounded-2xl" viewBox="0 0 370 200" preserveAspectRatio="none">
          {[0,22,44].map(o => <path key={o} d={`M0 ${100+o} Q90 ${85+o} 185 ${100+o} T370 ${100+o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />)}
        </svg>
        <div className="relative px-5 pt-4 pb-5">
          {/* Location + heart */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold">Half Moon Bay, CA</span>
              </div>
              <h2 className="text-white font-black text-2xl">Mavericks</h2>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mt-1">
              <Heart className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          {/* Buoy cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Primary */}
            <div className="bg-black/25 rounded-xl p-3 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">Primary</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-slate-500" />
                  <span className="text-slate-500 text-[9px]">4 min ago</span>
                </div>
              </div>
              <p className="text-white text-xs font-semibold leading-tight">Point Reyes, CA</p>
              <p className="text-slate-400 text-[9px] mb-2">Station 46237 · 18 mi offshore</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Waves</span>
                  <span className="text-emerald-400 text-[9px] font-semibold">4.5 ft @ 17s · WSW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Water</span>
                  <span className="text-cyan-400 text-[9px] font-semibold">58°F / 14°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Wind</span>
                  <span className="text-sky-400 text-[9px] font-semibold">5 mph NW</span>
                </div>
              </div>
            </div>

            {/* Backup */}
            <div className="bg-black/25 rounded-xl p-3 border border-sky-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="text-sky-400 text-[10px] font-bold">Backup</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-slate-500" />
                  <span className="text-slate-500 text-[9px]">11 min ago</span>
                </div>
              </div>
              <p className="text-white text-xs font-semibold leading-tight">Half Moon Bay</p>
              <p className="text-slate-400 text-[9px] mb-2">Station 46012 · 6 mi offshore</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Waves</span>
                  <span className="text-emerald-400 text-[9px] font-semibold">4.1 ft @ 16s · W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Water</span>
                  <span className="text-cyan-400 text-[9px] font-semibold">57°F / 14°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Wind</span>
                  <span className="text-sky-400 text-[9px] font-semibold">4 mph N</span>
                </div>
              </div>
            </div>
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
