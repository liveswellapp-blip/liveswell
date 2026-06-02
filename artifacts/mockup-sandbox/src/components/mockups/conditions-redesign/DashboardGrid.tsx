import { Waves, Wind, BarChart3, Droplets, Sun, MapPin, Bot, Star, ChevronRight, Navigation } from "lucide-react";

const score = 7.2;
const quality = "GOOD";

const stats = [
  { icon: Waves, label: "Waves", value: "4–5 ft", sub: "WSW @ 17s", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: Wind, label: "Wind", value: "5 mph", sub: "N · Offshore ✓", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  { icon: BarChart3, label: "Tides", value: "Rising", sub: "+1.2 ft · High 2:20 PM", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { icon: Droplets, label: "Water", value: "58°F", sub: "19°C · Clear", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { icon: Sun, label: "UV Index", value: "6", sub: "High · use SPF 30+", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: Navigation, label: "Wind Dir", value: "360°", sub: "Due North", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
];

const forecast = [
  { day: "Mon", wave: "4–5ft", wind: "5mph", score: 7, q: "bg-emerald-500" },
  { day: "Tue", wave: "3–4ft", wind: "8mph", score: 6, q: "bg-sky-500" },
  { day: "Wed", wave: "5–6ft", wind: "4mph", score: 8, q: "bg-emerald-500" },
  { day: "Thu", wave: "2–3ft", wind: "12mph", score: 5, q: "bg-amber-500" },
  { day: "Fri", wave: "3ft",   wind: "9mph",  score: 5, q: "bg-amber-500" },
];

const nearby = [
  { name: "Ocean Beach", dist: "3.2 mi" },
  { name: "Baker Beach", dist: "5.1 mi" },
  { name: "Linda Mar", dist: "8.4 mi" },
];

export function DashboardGrid() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Compact hero */}
      <div className="mx-3 mt-1 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 60%, #0f3460 100%)" }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold">Half Moon Bay, CA</span>
            </div>
            <p className="text-white font-black text-lg mt-0.5">Mavericks</p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-0.5">
              <span className="text-emerald-400 font-black text-3xl">{score}</span>
              <span className="text-emerald-600 text-sm font-bold">/10</span>
            </div>
            <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">{quality}</span>
          </div>
        </div>
        {/* Sunrise/sunset bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/20 text-[10px] text-slate-300">
          <span>🌅 Sunrise 6:18 AM</span>
          <div className="flex-1 mx-3 h-0.5 bg-gradient-to-r from-amber-400/60 via-yellow-300/80 to-amber-400/60 rounded-full" />
          <span>Sunset 8:24 PM 🌇</span>
        </div>
      </div>

      {/* 2-col stat grid */}
      <div className="grid grid-cols-2 gap-2 mx-3 mt-2">
        {stats.map(({ icon: Icon, label, value, sub, color, bg, border }) => (
          <div key={label} className={`${bg} ${border} border rounded-xl p-3 flex items-start gap-2.5`}>
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-[10px] font-medium">{label}</p>
              <p className={`font-bold text-sm ${color} leading-tight`}>{value}</p>
              <p className="text-slate-500 text-[10px] leading-tight truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 5-Day forecast strip */}
      <div className="mx-3 mt-2 bg-slate-800/60 rounded-xl border border-white/8 p-3">
        <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">5-Day Forecast</p>
        <div className="flex justify-between">
          {forecast.map(({ day, wave, wind, score, q }) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className="text-slate-400 text-[10px]">{day}</span>
              <div className={`w-6 h-6 rounded-full ${q} flex items-center justify-center`}>
                <span className="text-white text-[9px] font-black">{score}</span>
              </div>
              <span className="text-white text-[10px] font-semibold">{wave}</span>
              <span className="text-slate-500 text-[9px]">{wind}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI summary */}
      <div className="mx-3 mt-2 bg-emerald-900/25 rounded-xl border border-emerald-500/20 px-3 py-2.5 flex gap-2">
        <Bot className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-slate-300 text-[11px] leading-relaxed">Solid overhead sets from the NW. Light offshore winds keeping faces clean. Best window before 11am.</p>
      </div>

      {/* Nearby */}
      <div className="mx-3 mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Nearby Spots</p>
          <ChevronRight className="h-3 w-3 text-slate-500" />
        </div>
        <div className="flex gap-2">
          {nearby.map(({ name, dist }) => (
            <div key={name} className="flex-1 bg-slate-800/60 rounded-lg px-2.5 py-2 border border-white/6">
              <p className="text-white text-[10px] font-semibold truncate">{name}</p>
              <p className="text-slate-500 text-[9px]">{dist}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
