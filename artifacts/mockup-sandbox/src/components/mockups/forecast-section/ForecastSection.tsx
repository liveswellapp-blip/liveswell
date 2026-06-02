import { ChevronRight } from "lucide-react";

// ─── Mock tide/forecast data ──────────────────────────────────────────────────
const DAYS = [
  {
    day: "Today", date: "Jun 2",
    waveHeight: "2–3", wavePeriod: 8,
    windSpeed: 12, windDirection: "SSW", windLabel: "Onshore",
    sunrise: "6:22 AM", sunset: "8:14 PM",
    tides: [
      { time: "3:14 AM", height: 3.8, type: "high" },
      { time: "9:44 AM", height: 0.4, type: "low"  },
      { time: "3:52 PM", height: 3.5, type: "high" },
      { time: "10:01 PM",height: 0.6, type: "low"  },
    ],
  },
  {
    day: "Tue", date: "Jun 3",
    waveHeight: "3–4", wavePeriod: 10,
    windSpeed: 9, windDirection: "NW", windLabel: "Offshore",
    sunrise: "6:22 AM", sunset: "8:15 PM",
    tides: [
      { time: "4:02 AM", height: 3.9, type: "high" },
      { time: "10:28 AM",height: 0.3, type: "low"  },
      { time: "4:38 PM", height: 3.6, type: "high" },
      { time: "10:51 PM",height: 0.5, type: "low"  },
    ],
  },
  {
    day: "Wed", date: "Jun 4",
    waveHeight: "4–5", wavePeriod: 12,
    windSpeed: 7, windDirection: "WNW", windLabel: "Offshore",
    sunrise: "6:23 AM", sunset: "8:15 PM",
    tides: [
      { time: "4:51 AM", height: 4.0, type: "high" },
      { time: "11:10 AM",height: 0.3, type: "low"  },
      { time: "5:22 PM", height: 3.7, type: "high" },
      { time: "11:38 PM",height: 0.4, type: "low"  },
    ],
  },
  {
    day: "Thu", date: "Jun 5",
    waveHeight: "3–4", wavePeriod: 11,
    windSpeed: 11, windDirection: "W", windLabel: "Side-off",
    sunrise: "6:23 AM", sunset: "8:16 PM",
    tides: [
      { time: "5:39 AM", height: 3.9, type: "high" },
      { time: "11:51 AM",height: 0.4, type: "low"  },
      { time: "6:04 PM", height: 3.5, type: "high" },
      { time: "12:22 AM",height: 0.5, type: "low"  },
    ],
  },
  {
    day: "Fri", date: "Jun 6",
    waveHeight: "2–3", wavePeriod: 9,
    windSpeed: 14, windDirection: "SW", windLabel: "Onshore",
    sunrise: "6:24 AM", sunset: "8:16 PM",
    tides: [
      { time: "6:25 AM", height: 3.7, type: "high" },
      { time: "12:31 PM",height: 0.5, type: "low"  },
      { time: "6:45 PM", height: 3.3, type: "high" },
      { time: "1:02 AM", height: 0.7, type: "low"  },
    ],
  },
];

// ─── Compact TideChart (mirrors TideChart.tsx exactly, smaller) ───────────────
const VW = 280, VH = 80;
const TOP_PAD = 14, BOT_PAD = 18;

function parseHours(t: string) {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  const pm = m[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h + min / 60;
}

function tideY(norm: number) {
  return TOP_PAD + (1 - norm) * (VH - TOP_PAD - BOT_PAD);
}

interface TidePt { time: string; height: number; type: string; }

function buildTideCurve(tides: TidePt[]) {
  const resolution = 144;
  const step = 24 / resolution;
  const pts = tides.map(t => ({ hour: parseHours(t.time), height: t.height, type: t.type }))
                   .sort((a, b) => a.hour - b.hour);

  const heightAt = (time: number) => {
    let before = pts[pts.length - 1], after = pts[0];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].hour <= time) before = pts[i];
      if (pts[i].hour > time) { after = pts[i]; break; }
    }
    let frac: number;
    if (before.hour > after.hour) {
      const total = (24 - before.hour) + after.hour;
      const cur = time >= before.hour ? time - before.hour : 24 - before.hour + time;
      frac = cur / total;
    } else {
      const diff = after.hour - before.hour;
      frac = diff > 0 ? (time - before.hour) / diff : 0;
    }
    const t = Math.max(0, Math.min(1, frac));
    const cosT = (1 - Math.cos(t * Math.PI)) / 2;
    return before.height + (after.height - before.height) * cosT;
  };

  const hourly = Array.from({ length: resolution }, (_, i) => ({
    hour: i * step,
    height: heightAt(i * step),
  }));

  const heights = hourly.map(d => d.height);
  const minH = Math.min(...heights), maxH = Math.max(...heights);
  const range = maxH - minH;

  const pathPts = hourly.map((d, i) => {
    const x = (i / (resolution - 1)) * VW;
    const norm = range > 0 ? (d.height - minH) / range : 0.5;
    return [x, tideY(norm)] as [number, number];
  });

  const linePath = pathPts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
  const areaPath = `${linePath} L ${VW},${VH} L 0,${VH} Z`;

  // Major tide marker positions
  const markers = tides.map(tide => {
    const hr = parseHours(tide.time);
    const closest = hourly.reduce((acc, p) => Math.abs(p.hour - hr) < Math.abs(acc.hour - hr) ? p : acc);
    const idx = hourly.indexOf(closest);
    const x = (idx / (resolution - 1)) * VW;
    const norm = range > 0 ? (closest.height - minH) / range : 0.5;
    return { ...tide, svgX: x, svgY: tideY(norm) };
  });

  return { linePath, areaPath, markers, minH, maxH };
}

function CompactTideChart({ tides, isToday, sunrise, sunset, id }:
  { tides: TidePt[]; isToday: boolean; sunrise: string; sunset: string; id: string }) {

  const { linePath, areaPath, markers } = buildTideCurve(tides);

  const srX = (parseHours(sunrise) / 24) * VW;
  const ssX = (parseHours(sunset)  / 24) * VW;

  // Approximate current time ~7:00 PM for "today"
  const nowHour = 19.0;
  const nowX = (nowHour / 24) * VW;

  return (
    <div className="w-full rounded-xl overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.95) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>

      {/* SVG chart area */}
      <div className="relative" style={{ height: `${VH}px` }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`tg-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gradient fill */}
          <path d={areaPath} fill={`url(#tg-${id})`} />

          {/* Day/night shading */}
          <rect x="0" y="0" width={srX} height={VH} fill="black" opacity="0.28" />
          <rect x={ssX} y="0" width={VW - ssX} height={VH} fill="black" opacity="0.28" />

          {/* Sunrise / sunset dashed lines */}
          <line x1={srX} y1="0" x2={srX} y2={VH} stroke="#fbbf24" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5" />
          <line x1={ssX} y1="0" x2={ssX} y2={VH} stroke="#fb923c" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5" />

          {/* Curve */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Tick lines at high/low points */}
          {markers.map((m, i) => (
            <line key={i} x1={m.svgX} y1={m.svgY} x2={m.svgX} y2={VH}
              stroke="#10b981" strokeWidth="0.5" opacity="0.35" />
          ))}

          {/* Now line (today only) */}
          {isToday && (
            <line x1={nowX} y1="0" x2={nowX} y2={VH}
              stroke="white" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.7" />
          )}
        </svg>

        {/* High / Low badges — positioned absolutely over the SVG */}
        {markers.map((m, i) => {
          const leftPct = (m.svgX / VW) * 100;
          const topPct  = (m.svgY / VH) * 100;
          const isHigh  = m.type === "high";
          return (
            <div key={i} className="absolute flex flex-col items-center pointer-events-none"
              style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%, -50%)" }}>
              {isHigh && (
                <div className="mb-0.5 px-1 rounded leading-tight whitespace-nowrap"
                  style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "6px", color: "#6ee7b7" }}>
                  {m.time}
                </div>
              )}
              <div className="w-1 h-1 rounded-full" style={{ background: "#020617", border: "1px solid #34d399" }} />
              {!isHigh && (
                <div className="mt-0.5 px-1 rounded leading-tight whitespace-nowrap"
                  style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "6px", color: "#94a3b8" }}>
                  {m.time}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time axis strip */}
      <div className="relative flex items-center justify-between px-2"
        style={{ height: "18px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(2,6,23,0.4)" }}>
        {isToday && (
          <div className="absolute top-0 bottom-0 flex items-center pointer-events-none"
            style={{ left: `${(nowX / VW) * 100}%`, transform: "translateX(-50%)" }}>
            <div className="w-1 h-1 rounded-full" style={{ background: "rgba(52,211,153,0.8)" }} />
          </div>
        )}
        {["12a", "6a", "12p", "6p", "12a"].map((lbl, i) => (
          <span key={i} style={{ fontSize: "7px", color: "#64748b", fontWeight: 500 }}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Wind label colour ────────────────────────────────────────────────────────
function windColor(label: string) {
  if (label === "Offshore") return { text: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.25)" };
  if (label === "Onshore")  return { text: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.20)" };
  return                           { text: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.20)" };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ForecastSection() {
  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-6 pt-8">
      <div style={{ width: 960 }}>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">5-Day Surf Forecast</span>
          </div>
          <span className="text-slate-600 text-[10px]">Cocoa Beach, FL</span>
        </div>

        {/* Cards row */}
        <div className="flex gap-3">
          {DAYS.map((day, di) => {
            const isToday = di === 0;
            const wc = windColor(day.windLabel);
            return (
              <div key={di} className="flex-1 rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: isToday
                    ? "linear-gradient(160deg, #04202e 0%, #053040 100%)"
                    : "linear-gradient(160deg, #030f1c 0%, #041a2e 100%)",
                  border: isToday
                    ? "1px solid rgba(16,185,129,0.22)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}>

                {/* Day header */}
                <div className="px-3 pt-3 pb-2 border-b border-white/5">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-emerald-400" : "text-slate-300"}`}>{day.day}</span>
                    <span className="text-slate-600 text-[9px]">{day.date}</span>
                  </div>
                </div>

                {/* Wave + wind data */}
                <div className="px-3 pt-2.5 pb-2">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-emerald-400 font-black text-2xl leading-none">{day.waveHeight}</span>
                    <span className="text-emerald-700 text-[11px] font-semibold">ft</span>
                    <span className="text-teal-500 text-[10px] font-semibold ml-1">{day.wavePeriod}s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ color: wc.text }} className="text-[10px] font-bold">{day.windSpeed} mph</span>
                    <span className="text-slate-600 text-[9px]">{day.windDirection}</span>
                    <span className="ml-auto text-[7px] px-1.5 py-0.5 rounded-full font-semibold" style={{
                      background: wc.bg, color: wc.text, border: `1px solid ${wc.border}`,
                    }}>{day.windLabel}</span>
                  </div>
                </div>

                {/* Compact tide chart — same design as real app */}
                <div className="px-2 pb-2 mt-auto">
                  <CompactTideChart
                    tides={day.tides}
                    isToday={isToday}
                    sunrise={day.sunrise}
                    sunset={day.sunset}
                    id={`day-${di}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-slate-700 text-[9px]">NOAA wave forecast · OpenWeatherMap wind</span>
          <button className="flex items-center gap-1 text-slate-600 text-[10px] hover:text-slate-400">
            More details <ChevronRight size={10} />
          </button>
        </div>

      </div>
    </div>
  );
}
