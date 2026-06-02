import { Wind } from "lucide-react";

// 48 hours of mock data — NOW = hour index 19 (7 PM today)
const MOCK_DATA = [
  { hour: 0,  time: "12:00 AM", date: "Today",    windSpeed: 8,  windGusts: 11, windDirection: "NNE" },
  { hour: 1,  time: "1:00 AM",  date: "Today",    windSpeed: 7,  windGusts: 10, windDirection: "NE"  },
  { hour: 2,  time: "2:00 AM",  date: "Today",    windSpeed: 7,  windGusts: 9,  windDirection: "NE"  },
  { hour: 3,  time: "3:00 AM",  date: "Today",    windSpeed: 6,  windGusts: 8,  windDirection: "ENE" },
  { hour: 4,  time: "4:00 AM",  date: "Today",    windSpeed: 5,  windGusts: 7,  windDirection: "ENE" },
  { hour: 5,  time: "5:00 AM",  date: "Today",    windSpeed: 5,  windGusts: 7,  windDirection: "E"   },
  { hour: 6,  time: "6:00 AM",  date: "Today",    windSpeed: 6,  windGusts: 8,  windDirection: "E"   },
  { hour: 7,  time: "7:00 AM",  date: "Today",    windSpeed: 8,  windGusts: 10, windDirection: "ESE" },
  { hour: 8,  time: "8:00 AM",  date: "Today",    windSpeed: 10, windGusts: 13, windDirection: "ESE" },
  { hour: 9,  time: "9:00 AM",  date: "Today",    windSpeed: 12, windGusts: 16, windDirection: "SE"  },
  { hour: 10, time: "10:00 AM", date: "Today",    windSpeed: 14, windGusts: 18, windDirection: "SE"  },
  { hour: 11, time: "11:00 AM", date: "Today",    windSpeed: 16, windGusts: 21, windDirection: "SSE" },
  { hour: 12, time: "12:00 PM", date: "Today",    windSpeed: 18, windGusts: 24, windDirection: "SSE" },
  { hour: 13, time: "1:00 PM",  date: "Today",    windSpeed: 19, windGusts: 25, windDirection: "S"   },
  { hour: 14, time: "2:00 PM",  date: "Today",    windSpeed: 20, windGusts: 26, windDirection: "S"   },
  { hour: 15, time: "3:00 PM",  date: "Today",    windSpeed: 21, windGusts: 27, windDirection: "SSW" },
  { hour: 16, time: "4:00 PM",  date: "Today",    windSpeed: 20, windGusts: 26, windDirection: "SSW" },
  { hour: 17, time: "5:00 PM",  date: "Today",    windSpeed: 19, windGusts: 25, windDirection: "SW"  },
  { hour: 18, time: "6:00 PM",  date: "Today",    windSpeed: 18, windGusts: 23, windDirection: "SW"  },
  { hour: 19, time: "7:00 PM",  date: "Today",    windSpeed: 17, windGusts: 22, windDirection: "WSW" },
  { hour: 20, time: "8:00 PM",  date: "Today",    windSpeed: 15, windGusts: 19, windDirection: "WSW" },
  { hour: 21, time: "9:00 PM",  date: "Today",    windSpeed: 14, windGusts: 17, windDirection: "W"   },
  { hour: 22, time: "10:00 PM", date: "Today",    windSpeed: 12, windGusts: 15, windDirection: "W"   },
  { hour: 23, time: "11:00 PM", date: "Today",    windSpeed: 11, windGusts: 14, windDirection: "WNW" },
  { hour: 24, time: "12:00 AM", date: "Tomorrow", windSpeed: 10, windGusts: 13, windDirection: "WNW" },
  { hour: 25, time: "1:00 AM",  date: "Tomorrow", windSpeed: 9,  windGusts: 12, windDirection: "NW"  },
  { hour: 26, time: "2:00 AM",  date: "Tomorrow", windSpeed: 8,  windGusts: 11, windDirection: "NW"  },
  { hour: 27, time: "3:00 AM",  date: "Tomorrow", windSpeed: 8,  windGusts: 10, windDirection: "NNW" },
  { hour: 28, time: "4:00 AM",  date: "Tomorrow", windSpeed: 7,  windGusts: 9,  windDirection: "NNW" },
  { hour: 29, time: "5:00 AM",  date: "Tomorrow", windSpeed: 6,  windGusts: 8,  windDirection: "N"   },
  { hour: 30, time: "6:00 AM",  date: "Tomorrow", windSpeed: 7,  windGusts: 9,  windDirection: "N"   },
  { hour: 31, time: "7:00 AM",  date: "Tomorrow", windSpeed: 9,  windGusts: 12, windDirection: "NNE" },
  { hour: 32, time: "8:00 AM",  date: "Tomorrow", windSpeed: 11, windGusts: 14, windDirection: "NNE" },
  { hour: 33, time: "9:00 AM",  date: "Tomorrow", windSpeed: 13, windGusts: 17, windDirection: "NE"  },
  { hour: 34, time: "10:00 AM", date: "Tomorrow", windSpeed: 15, windGusts: 19, windDirection: "NE"  },
  { hour: 35, time: "11:00 AM", date: "Tomorrow", windSpeed: 16, windGusts: 21, windDirection: "ENE" },
  { hour: 36, time: "12:00 PM", date: "Tomorrow", windSpeed: 17, windGusts: 22, windDirection: "E"   },
  { hour: 37, time: "1:00 PM",  date: "Tomorrow", windSpeed: 18, windGusts: 23, windDirection: "E"   },
  { hour: 38, time: "2:00 PM",  date: "Tomorrow", windSpeed: 19, windGusts: 24, windDirection: "ESE" },
  { hour: 39, time: "3:00 PM",  date: "Tomorrow", windSpeed: 18, windGusts: 23, windDirection: "SE"  },
  { hour: 40, time: "4:00 PM",  date: "Tomorrow", windSpeed: 17, windGusts: 22, windDirection: "SE"  },
  { hour: 41, time: "5:00 PM",  date: "Tomorrow", windSpeed: 16, windGusts: 20, windDirection: "SSE" },
  { hour: 42, time: "6:00 PM",  date: "Tomorrow", windSpeed: 14, windGusts: 18, windDirection: "SSE" },
  { hour: 43, time: "7:00 PM",  date: "Tomorrow", windSpeed: 13, windGusts: 17, windDirection: "S"   },
  { hour: 44, time: "8:00 PM",  date: "Tomorrow", windSpeed: 12, windGusts: 15, windDirection: "S"   },
  { hour: 45, time: "9:00 PM",  date: "Tomorrow", windSpeed: 10, windGusts: 13, windDirection: "SSW" },
  { hour: 46, time: "10:00 PM", date: "Tomorrow", windSpeed: 9,  windGusts: 12, windDirection: "SW"  },
  { hour: 47, time: "11:00 PM", date: "Tomorrow", windSpeed: 8,  windGusts: 10, windDirection: "SW"  },
];

const NOW_IDX = 19;

// ─── Chart geometry ──────────────────────────────────────────────────────────
const W = 560;
const H = 180;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 32;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

const speeds = MOCK_DATA.map(d => d.windSpeed);
const gusts  = MOCK_DATA.map(d => d.windGusts);
const MIN_V = 0;
const MAX_V = Math.ceil(Math.max(...gusts)) + 2;

function xOf(i: number) {
  return PAD_L + (i / (MOCK_DATA.length - 1)) * CHART_W;
}
function yOf(v: number) {
  return PAD_T + CHART_H - ((v - MIN_V) / (MAX_V - MIN_V)) * CHART_H;
}
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}
function areaPath(pts: [number, number][]): string {
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L ${last[0]} ${PAD_T + CHART_H} L ${first[0]} ${PAD_T + CHART_H} Z`;
}

const speedPts: [number, number][] = MOCK_DATA.map((d, i) => [xOf(i), yOf(d.windSpeed)]);
const gustPts:  [number, number][] = MOCK_DATA.map((d, i) => [xOf(i), yOf(d.windGusts)]);

const gridLines: number[] = [];
for (let v = 5; v <= MAX_V; v += 5) gridLines.push(v);

// Label every 6 hours
const xLabels = [0, 6, 12, 18, 24, 30, 36, 42, 47];

function xLabel(i: number) {
  if (i === 0)  return "12a";
  if (i === 24) return "12a+";
  const h = i % 24;
  if (h === 0)  return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export default function WindForecast() {
  const nowPt    = speedPts[NOW_IDX];
  const nowData  = MOCK_DATA[NOW_IDX];
  const maxSpeed = Math.max(...speeds);
  const maxGust  = Math.max(...gusts);

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-4 pt-6">
      <div className="w-[600px] rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #030f1c 0%, #041a2e 60%, #021825 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="text-cyan-400 text-[11px] font-bold tracking-widest uppercase">Wind Forecast</span>
                <span className="bg-cyan-900/60 text-cyan-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-cyan-700/40">OpenWeatherMap</span>
              </div>
              <h2 className="text-white font-bold text-base leading-tight">Cocoa Beach, FL</h2>
              <p className="text-slate-500 text-[10px] mt-0.5">48-hour forecast · Updated just now</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-cyan-400 font-black text-3xl leading-none">{nowData.windSpeed}</span>
                <span className="text-cyan-600 text-sm font-semibold">mph</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="text-slate-400 text-[10px]">{nowData.windDirection}</span>
                <span className="text-slate-600 text-[10px]">·</span>
                <span className="text-slate-400 text-[10px]">Gusts {nowData.windGusts} mph</span>
              </div>
              <p className="text-slate-600 text-[9px] mt-0.5">now · {nowData.time}</p>
            </div>
          </div>

          {/* Peak stats row */}
          <div className="mt-3 flex gap-3">
            <div className="flex-1 bg-cyan-900/20 border border-cyan-700/20 rounded-lg px-3 py-2">
              <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Peak Speed</p>
              <div className="flex items-baseline gap-1">
                <span className="text-cyan-400 font-bold text-sm">{maxSpeed}</span>
                <span className="text-cyan-700 text-[10px]">mph</span>
              </div>
            </div>
            <div className="flex-1 bg-cyan-900/20 border border-cyan-700/20 rounded-lg px-3 py-2">
              <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Peak Gusts</p>
              <div className="flex items-baseline gap-1">
                <span className="text-cyan-400 font-bold text-sm">{maxGust}</span>
                <span className="text-cyan-700 text-[10px]">mph</span>
              </div>
            </div>
            <div className="flex-1 bg-cyan-900/20 border border-cyan-700/20 rounded-lg px-3 py-2">
              <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Avg Speed</p>
              <div className="flex items-baseline gap-1">
                <span className="text-cyan-400 font-bold text-sm">{Math.round(speeds.reduce((a,b) => a+b, 0) / speeds.length)}</span>
                <span className="text-cyan-700 text-[10px]">mph</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Wind speed + gusts chart ── */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-400 rounded" />
              <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Speed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: "rgba(34,211,238,0.35)", borderTop: "1px dashed rgba(34,211,238,0.5)" }} />
              <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Gusts</span>
            </div>
            <span className="text-slate-600 text-[10px] ml-auto">mph</span>
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="gustGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset={`${(NOW_IDX / (MOCK_DATA.length - 1)) * 100}%`} stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.4" />
              </linearGradient>
              <clipPath id="wPastClip"><rect x={0} y={0} width={xOf(NOW_IDX)} height={H} /></clipPath>
              <clipPath id="wFutureClip"><rect x={xOf(NOW_IDX)} y={0} width={W} height={H} /></clipPath>
            </defs>

            {/* Grid lines */}
            {gridLines.map(v => (
              <g key={v}>
                <line x1={PAD_L} y1={yOf(v)} x2={PAD_L + CHART_W} y2={yOf(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={PAD_L - 6} y={yOf(v) + 3.5} textAnchor="end" fill="#475569" fontSize="9" fontFamily="sans-serif">{v}</text>
              </g>
            ))}
            <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Today / Tomorrow divider */}
            <line x1={xOf(24)} y1={PAD_T} x2={xOf(24)} y2={PAD_T + CHART_H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={xOf(12)} y={PAD_T - 6} textAnchor="middle" fill="#334155" fontSize="8" fontFamily="sans-serif">TODAY</text>
            <text x={xOf(36)} y={PAD_T - 6} textAnchor="middle" fill="#334155" fontSize="8" fontFamily="sans-serif">TOMORROW</text>

            {/* Gust area + dashed line */}
            <path d={areaPath(gustPts)} fill="url(#gustGrad)" />
            <path d={smoothPath(gustPts)} fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5" strokeDasharray="4 3" clipPath="url(#wPastClip)" />
            <path d={smoothPath(gustPts)} fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="1.5" strokeDasharray="4 3" clipPath="url(#wFutureClip)" />

            {/* Speed area + line */}
            <path d={areaPath(speedPts)} fill="url(#windGrad)" />
            <path d={smoothPath(speedPts)} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" clipPath="url(#wPastClip)" />
            <path d={smoothPath(speedPts)} fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" clipPath="url(#wFutureClip)" opacity="0.35" />

            {/* Dots every 6 hours */}
            {MOCK_DATA.filter((_, i) => i % 6 === 0).map((_, rawI) => {
              const i = rawI * 6;
              const [cx, cy] = speedPts[i];
              const isPast = i <= NOW_IDX;
              return <circle key={i} cx={cx} cy={cy} r="3" fill={isPast ? "#22d3ee" : "#1f2937"} stroke={isPast ? "#0891b2" : "#374151"} strokeWidth="1.5" />;
            })}

            {/* NOW marker */}
            <line x1={nowPt[0]} y1={PAD_T} x2={nowPt[0]} y2={PAD_T + CHART_H} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <circle cx={nowPt[0]} cy={nowPt[1]} r="5" fill="#22d3ee" stroke="#021825" strokeWidth="2" />
            <circle cx={nowPt[0]} cy={nowPt[1]} r="9" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
            <text x={nowPt[0]} y={PAD_T - 4} textAnchor="middle" fill="#22d3ee" fontSize="8" fontFamily="sans-serif" fontWeight="700">NOW</text>

            {/* X-axis labels */}
            {xLabels.map(i => (
              <text key={i} x={xOf(i)} y={PAD_T + CHART_H + 14} textAnchor="middle" fill="#475569" fontSize="8.5" fontFamily="sans-serif">
                {xLabel(i)}
              </text>
            ))}
          </svg>
        </div>

        {/* ── Gusts bar row ── */}
        <div className="px-4 pt-1 pb-3">
          <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Gusts (mph)</p>
          <div className="flex gap-0.5">
            {MOCK_DATA.map((d, i) => {
              const isPast = i <= NOW_IDX;
              const isNow  = i === NOW_IDX;
              const intensity = d.windGusts / maxGust;
              return (
                <div key={i} className="flex-1">
                  <div className="w-full rounded text-center text-[7px] font-semibold py-0.5" style={{
                    background: isNow
                      ? "#22d3ee"
                      : isPast
                        ? `rgba(34,211,238,${0.1 + intensity * 0.25})`
                        : "rgba(255,255,255,0.03)",
                    color: isNow ? "#021825" : isPast ? "#67e8f9" : "#374151",
                  }}>{i % 3 === 0 ? d.windGusts : ""}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Direction badges row ── */}
        <div className="px-4 pb-4 border-b border-white/5">
          <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Direction</p>
          <div className="flex gap-1.5 flex-wrap">
            {[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 47].map(i => {
              const d = MOCK_DATA[i];
              const isPast = i <= NOW_IDX;
              const isNow  = i === NOW_IDX;
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-slate-600">
                    {i === 0 ? "12a" : i === 24 ? "+12a" : i < 24
                      ? (i === 12 ? "12p" : i < 12 ? `${i}a` : `${i-12}p`)
                      : (i === 36 ? "+12p" : i < 36 ? `+${i-24}a` : `+${i-36}p`)}
                  </span>
                  <div className="px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5" style={{
                    background: isNow ? "#22d3ee" : isPast ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.04)",
                    color: isNow ? "#021825" : isPast ? "#67e8f9" : "#4b5563",
                    border: isNow ? "none" : isPast ? "1px solid rgba(34,211,238,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {d.windDirection}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Data table ── */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-2">All Readings</p>
          <div className="rounded-xl overflow-hidden border border-white/6">
            <div className="grid grid-cols-4 px-3 py-2" style={{ background: "rgba(34,211,238,0.07)" }}>
              {["Time", "Speed", "Gusts", "Direction"].map(h => (
                <span key={h} className="text-cyan-700 text-[9px] font-bold uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#0c3040 transparent" }}>
              {[...MOCK_DATA].reverse().map((d, revI) => {
                const i = MOCK_DATA.length - 1 - revI;
                const isNow  = i === NOW_IDX;
                const isPast = i < NOW_IDX;
                const showDate = revI === 0 || d.date !== [...MOCK_DATA].reverse()[revI - 1].date;
                return (
                  <div key={i}>
                    {showDate && (
                      <div className="px-3 py-1" style={{ background: "rgba(34,211,238,0.04)" }}>
                        <span className="text-cyan-800 text-[8px] font-bold uppercase tracking-widest">{d.date}</span>
                      </div>
                    )}
                    <div
                      className="grid grid-cols-4 px-3 py-2 border-t border-white/4"
                      style={{
                        background: isNow
                          ? "rgba(34,211,238,0.1)"
                          : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium ${isNow ? "text-cyan-300" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                          {d.time}
                        </span>
                        {isNow && (
                          <span className="text-[7px] bg-cyan-500 text-black font-bold px-1 py-0.5 rounded-full leading-none">NOW</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${isNow ? "text-cyan-400" : isPast ? "text-cyan-600" : "text-slate-600"}`}>
                        {d.windSpeed} mph
                      </span>
                      <span className={`text-[10px] ${isNow ? "text-cyan-300" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                        {d.windGusts} mph
                      </span>
                      <span className={`text-[10px] ${isNow ? "text-sky-400" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                        {d.windDirection}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-slate-600 text-[9px]">Data from OpenWeatherMap</span>
          <span className="text-slate-700 text-[9px]">Updated just now</span>
        </div>

      </div>
    </div>
  );
}
