import { Waves, Wind, BarChart3, Droplets, Sun, MapPin, Clock, Heart } from "lucide-react";

// ─── Static tide data ──────────────────────────────────────────────────────
const TIDES = [
  { type: "low",  time: "2:30 AM",  hour: 2.5,  height: 0.8 },
  { type: "high", time: "8:45 AM",  hour: 8.75, height: 4.2 },
  { type: "low",  time: "3:15 PM",  hour: 15.25,height: 1.1 },
  { type: "high", time: "9:30 PM",  hour: 21.5, height: 4.8 },
];
const SUNRISE_HOUR = 6.25;   // 6:15 AM
const SUNSET_HOUR  = 20.37;  // 8:22 PM
const NOW_HOUR     = 9.683;  // 9:41 AM (matches status bar)

// ─── Tide curve math ───────────────────────────────────────────────────────
function buildTidePath(vw: number, vh: number, topPad: number, botPad: number) {
  const RESOLUTION = 120;
  const step = 24 / RESOLUTION;
  const usable = vh - topPad - botPad;

  const getHeight = (t: number) => {
    const sorted = [...TIDES].sort((a, b) => a.hour - b.hour);
    let before = sorted[sorted.length - 1];
    let after  = sorted[0];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].hour <= t) before = sorted[i];
      if (sorted[i].hour > t) { after = sorted[i]; break; }
    }
    let frac: number;
    if (before.hour > after.hour) {
      const total = (24 - before.hour) + after.hour;
      const cur   = t >= before.hour ? t - before.hour : 24 - before.hour + t;
      frac = cur / total;
    } else {
      const diff = after.hour - before.hour;
      frac = diff > 0 ? (t - before.hour) / diff : 0;
    }
    const cosT = (1 - Math.cos(Math.max(0, Math.min(1, frac)) * Math.PI)) / 2;
    return before.height + (after.height - before.height) * cosT;
  };

  const pts = Array.from({ length: RESOLUTION }, (_, i) => {
    const t = i * step;
    const h = getHeight(t);
    return { t, h };
  });

  const maxH = Math.max(...pts.map(p => p.h));
  const minH = Math.min(...pts.map(p => p.h));
  const range = maxH - minH;

  const toY = (h: number) => topPad + (1 - (range > 0 ? (h - minH) / range : 0.5)) * usable;
  const toX = (t: number, idx: number) => (idx / (RESOLUTION - 1)) * vw;

  const path = pts.map((p, i) => `${toX(p.t, i).toFixed(1)},${toY(p.h).toFixed(1)}`).join(" L ");

  const markers = TIDES.map(tide => {
    const idx = pts.reduce((best, p, i) =>
      Math.abs(p.t - tide.hour) < Math.abs(pts[best].t - tide.hour) ? i : best, 0);
    const x = toX(pts[idx].t, idx);
    const y = toY(pts[idx].h);
    return { ...tide, x, y };
  });

  return { path: `M ${path}`, markers, toY, maxH, minH, range };
}

// ─── Tide chart card ───────────────────────────────────────────────────────
function TideCard() {
  const VW = 340; const VH = 120;
  const TOP = 20;  const BOT = 28;

  const { path, markers } = buildTidePath(VW, VH, TOP, BOT);

  const nowX = (NOW_HOUR / 24) * VW;
  const srX  = (SUNRISE_HOUR / 24) * VW;
  const ssX  = (SUNSET_HOUR  / 24) * VW;

  const gradId = "tideGrad-dash";

  return (
    <div className="mx-3 mt-2 rounded-xl border border-white/8"
         style={{ background: "linear-gradient(135deg, #0f172a, #020617)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-cyan-400" />
          <span className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Tides Today</span>
        </div>
        <span className="text-slate-500 text-[9px]">NOAA Tides &amp; Currents</span>
      </div>

      {/* SVG chart */}
      <div className="relative mx-2 overflow-visible" style={{ height: `${VH}px` }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Night shading */}
          <rect x="0"   y="0" width={srX}        height={VH} fill="black" opacity="0.3" />
          <rect x={ssX} y="0" width={VW - ssX}   height={VH} fill="black" opacity="0.3" />

          {/* Sunrise / sunset dashed lines */}
          <line x1={srX} y1="0" x2={srX} y2={VH} stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 5" opacity="0.45" />
          <line x1={ssX} y1="0" x2={ssX} y2={VH} stroke="#fb923c" strokeWidth="1" strokeDasharray="3 5" opacity="0.45" />

          {/* Fill under curve */}
          <path d={`${path} L ${VW},${VH} L 0,${VH} Z`} fill={`url(#${gradId})`} />

          {/* Curve */}
          <path d={path} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* High/low tick lines */}
          {markers.map((m, i) => (
            <line key={i} x1={m.x} y1={m.y} x2={m.x} y2={VH}
                  stroke="#06b6d4" strokeWidth="0.5" opacity="0.35" />
          ))}

          {/* Now indicator */}
          <line x1={nowX} y1="0" x2={nowX} y2={VH}
                stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
        </svg>

        {/* High/Low markers */}
        {markers.map((m, i) => {
          const pctX = (m.x / VW) * 100;
          const pctY = (m.y / VH) * 100;
          const isHigh = m.type === "high";
          return (
            <div key={i} className="absolute flex flex-col items-center pointer-events-none"
                 style={{ left: `${pctX}%`, top: `${pctY}%`, transform: "translate(-50%,-50%)" }}>
              {isHigh && (
                <div className="mb-0.5 px-1 py-px rounded bg-slate-900/90 border border-white/10
                                text-[8px] font-semibold text-cyan-300 whitespace-nowrap leading-tight">
                  {m.time} · {m.height}ft
                </div>
              )}
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950 border border-cyan-400" />
              {!isHigh && (
                <div className="mt-0.5 px-1 py-px rounded bg-slate-900/90 border border-white/10
                                text-[8px] font-semibold text-slate-300 whitespace-nowrap leading-tight">
                  {m.time} · {m.height}ft
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time axis */}
      <div className="flex items-center justify-between px-3 border-t border-white/8 pb-2 pt-1">
        {["12a","6a","12p","6p","12a"].map((l, i) => (
          <span key={i} className="text-[9px] text-slate-500">{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Stats + forecast data ─────────────────────────────────────────────────
const stats = [
  { icon: Waves,    label: "Wave Height",  value: "4–5 ft",      sub: "WSW swell",               color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
  { icon: Wind,     label: "Wind",         value: "5 mph N",     sub: "Offshore ↗",              color: "text-sky-400",     border: "border-sky-500/20",     bg: "bg-sky-500/8" },
  { icon: Waves,    label: "Wave Period",  value: "17 sec",      sub: "Long-period groundswell",  color: "text-teal-400",    border: "border-teal-500/20",    bg: "bg-teal-500/8" },
  { icon: BarChart3,label: "Tide",         value: "Rising",      sub: "+1.2 ft · High 8:45 AM",   color: "text-cyan-400",    border: "border-cyan-500/20",    bg: "bg-cyan-500/8" },
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

// ─── Main component ────────────────────────────────────────────────────────
export function DashboardGrid() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-y-auto">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400 flex-shrink-0">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Hero card — location + buoy data */}
      <div className="mx-3 mt-1 rounded-2xl relative flex-shrink-0"
           style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 50%, #0c2340 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10 rounded-2xl"
             viewBox="0 0 370 200" preserveAspectRatio="none">
          {[0,22,44].map(o => (
            <path key={o} d={`M0 ${100+o} Q90 ${85+o} 185 ${100+o} T370 ${100+o}`}
                  stroke="#10b981" strokeWidth="1.5" fill="none" />
          ))}
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
            {/* Buoy #1 */}
            <div className="bg-black/25 rounded-xl p-3 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">Buoy #1</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                  <span className="text-slate-400 text-[9px]">4 min ago</span>
                </div>
              </div>
              <p className="text-emerald-400 text-xs font-semibold leading-tight">Point Reyes, CA</p>
              <p className="text-slate-400 text-[9px] mb-2">Station 46237</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Waves</span>
                  <span className="text-emerald-400 text-[9px] font-semibold">4.5 ft @ 17s · WSW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Water</span>
                  <span className="text-emerald-400 text-[9px] font-semibold">58°F / 14°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Wind</span>
                  <span className="text-emerald-400 text-[9px] font-semibold">5 mph NW</span>
                </div>
              </div>
            </div>

            {/* Buoy #2 */}
            <div className="bg-black/25 rounded-xl p-3 border border-sky-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="text-sky-400 text-[10px] font-bold">Buoy #2</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                  <span className="text-slate-400 text-[9px]">11 min ago</span>
                </div>
              </div>
              <p className="text-sky-400 text-xs font-semibold leading-tight">Half Moon Bay</p>
              <p className="text-slate-400 text-[9px] mb-2">Station 46012</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Waves</span>
                  <span className="text-sky-400 text-[9px] font-semibold">4.1 ft @ 16s · W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[9px]">Water</span>
                  <span className="text-sky-400 text-[9px] font-semibold">57°F / 14°C</span>
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

      {/* Tide chart — right below hero */}
      <TideCard />

      {/* 2-col stat grid */}
      <div className="grid grid-cols-2 gap-2 mx-3 mt-2 flex-shrink-0">
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
      <div className="mx-3 mt-2 mb-4 bg-slate-800/60 rounded-xl border border-white/8 p-3 flex-shrink-0">
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
