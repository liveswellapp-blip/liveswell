// Mock data — matches real API shape: historicalData[]
const MOCK_DATA = [
  { hour: 0,  time: "12:00 AM", waveHeight: 2.8, wavePeriod: 10, waveDirection: "E"   },
  { hour: 1,  time: "1:00 AM",  waveHeight: 2.6, wavePeriod: 10, waveDirection: "E"   },
  { hour: 2,  time: "2:00 AM",  waveHeight: 2.5, wavePeriod: 11, waveDirection: "ENE" },
  { hour: 3,  time: "3:00 AM",  waveHeight: 2.3, wavePeriod: 11, waveDirection: "ENE" },
  { hour: 4,  time: "4:00 AM",  waveHeight: 2.1, wavePeriod: 11, waveDirection: "ENE" },
  { hour: 5,  time: "5:00 AM",  waveHeight: 2.0, wavePeriod: 12, waveDirection: "NE"  },
  { hour: 6,  time: "6:00 AM",  waveHeight: 1.9, wavePeriod: 12, waveDirection: "NE"  },
  { hour: 7,  time: "7:00 AM",  waveHeight: 1.8, wavePeriod: 12, waveDirection: "NE"  },
  { hour: 8,  time: "8:00 AM",  waveHeight: 1.9, wavePeriod: 11, waveDirection: "E"   },
  { hour: 9,  time: "9:00 AM",  waveHeight: 2.1, wavePeriod: 11, waveDirection: "E"   },
  { hour: 10, time: "10:00 AM", waveHeight: 2.4, wavePeriod: 10, waveDirection: "E"   },
  { hour: 11, time: "11:00 AM", waveHeight: 2.6, wavePeriod: 10, waveDirection: "ESE" },
  { hour: 12, time: "12:00 PM", waveHeight: 2.9, wavePeriod:  9, waveDirection: "ESE" },
  { hour: 13, time: "1:00 PM",  waveHeight: 3.2, wavePeriod:  9, waveDirection: "SE"  },
  { hour: 14, time: "2:00 PM",  waveHeight: 3.5, wavePeriod:  8, waveDirection: "SE"  },
  { hour: 15, time: "3:00 PM",  waveHeight: 3.8, wavePeriod:  8, waveDirection: "SE"  },
  { hour: 16, time: "4:00 PM",  waveHeight: 4.0, wavePeriod:  8, waveDirection: "SSE" },
  { hour: 17, time: "5:00 PM",  waveHeight: 3.9, wavePeriod:  9, waveDirection: "SSE" },
  { hour: 18, time: "6:00 PM",  waveHeight: 3.6, wavePeriod:  9, waveDirection: "S"   },
  { hour: 19, time: "7:00 PM",  waveHeight: 3.3, wavePeriod:  9, waveDirection: "S"   },
  { hour: 20, time: "8:00 PM",  waveHeight: 3.0, wavePeriod: 10, waveDirection: "SSE" },
  { hour: 21, time: "9:00 PM",  waveHeight: 2.8, wavePeriod: 10, waveDirection: "SE"  },
  { hour: 22, time: "10:00 PM", waveHeight: 2.5, wavePeriod: 10, waveDirection: "E"   },
  { hour: 23, time: "11:00 PM", waveHeight: 2.2, wavePeriod: 11, waveDirection: "E"   },
];

// "Now" = hour 18 (6 PM) for demo
const NOW_IDX = 18;

// ─── Chart geometry ──────────────────────────────────────────────────────────
const W = 560;
const H = 180;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 32;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

const heights = MOCK_DATA.map(d => d.waveHeight);
const MIN_H = 0;
const MAX_H = Math.ceil(Math.max(...heights)) + 0.5;

function xOf(i: number) {
  return PAD_L + (i / (MOCK_DATA.length - 1)) * CHART_W;
}
function yOf(v: number) {
  return PAD_T + CHART_H - ((v - MIN_H) / (MAX_H - MIN_H)) * CHART_H;
}

// Smooth bezier path
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

const points: [number, number][] = MOCK_DATA.map((d, i) => [xOf(i), yOf(d.waveHeight)]);

// Y-axis grid lines at 1ft intervals
const gridLines: number[] = [];
for (let v = 1; v <= Math.ceil(MAX_H); v++) gridLines.push(v);

// X-axis labels every 4 hours
const xLabels = [0, 4, 8, 12, 16, 20, 23];

export default function BuoyHistory() {
  const nowPt = points[NOW_IDX];
  const nowData = MOCK_DATA[NOW_IDX];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Modal panel */}
      <div className="w-[600px] rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #030f1c 0%, #041a2e 60%, #021810 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">Buoy #1</span>
                <span className="bg-emerald-900/60 text-emerald-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-700/40">
                  NOAA Live
                </span>
              </div>
              <h2 className="text-white font-bold text-base leading-tight">Cape Canaveral Nearshore, FL</h2>
              <p className="text-slate-500 text-[10px] mt-0.5">Station 41113 · 24-hour history</p>
            </div>
            {/* Current snapshot */}
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-emerald-400 font-black text-3xl leading-none">
                  {nowData.waveHeight.toFixed(1)}
                </span>
                <span className="text-emerald-600 text-sm font-semibold">ft</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="text-slate-400 text-[10px]">{nowData.wavePeriod}s</span>
                <span className="text-slate-600 text-[10px]">·</span>
                <span className="text-slate-400 text-[10px]">{nowData.waveDirection}</span>
              </div>
              <p className="text-slate-600 text-[9px] mt-0.5">now · 6:00 PM</p>
            </div>
          </div>
        </div>

        {/* ── Wave height chart ─────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Wave Height</span>
            <span className="text-slate-600 text-[10px]">ft</span>
          </div>

          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset={`${(NOW_IDX / (MOCK_DATA.length - 1)) * 100}%`} stopColor="#10b981" />
                <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {gridLines.map(v => (
              <g key={v}>
                <line
                  x1={PAD_L} y1={yOf(v)} x2={PAD_L + CHART_W} y2={yOf(v)}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                />
                <text x={PAD_L - 6} y={yOf(v) + 3.5} textAnchor="end"
                  fill="#475569" fontSize="9" fontFamily="sans-serif">
                  {v}
                </text>
              </g>
            ))}

            {/* Baseline */}
            <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Area fill */}
            <path d={areaPath(points)} fill="url(#waveGrad)" />

            {/* Past (solid) vs future (dashed) line */}
            {/* Past portion */}
            <clipPath id="pastClip">
              <rect x={0} y={0} width={xOf(NOW_IDX)} height={H} />
            </clipPath>
            <clipPath id="futureClip">
              <rect x={xOf(NOW_IDX)} y={0} width={W} height={H} />
            </clipPath>
            <path d={smoothPath(points)} fill="none" stroke="url(#lineGrad)" strokeWidth="2"
              strokeLinecap="round" clipPath="url(#pastClip)" />
            <path d={smoothPath(points)} fill="none" stroke="#6ee7b7" strokeWidth="1.5"
              strokeLinecap="round" strokeDasharray="4 4" clipPath="url(#futureClip)" opacity="0.35" />

            {/* Data dots — sparse, every 4 hours */}
            {MOCK_DATA.filter((_, i) => i % 4 === 0).map((_, rawI) => {
              const i = rawI * 4;
              const [cx, cy] = points[i];
              const isPast = i <= NOW_IDX;
              return (
                <circle key={i} cx={cx} cy={cy} r="3"
                  fill={isPast ? "#10b981" : "#1f2937"}
                  stroke={isPast ? "#059669" : "#374151"}
                  strokeWidth="1.5" />
              );
            })}

            {/* Now vertical line */}
            <line x1={nowPt[0]} y1={PAD_T} x2={nowPt[0]} y2={PAD_T + CHART_H}
              stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

            {/* Now dot */}
            <circle cx={nowPt[0]} cy={nowPt[1]} r="5"
              fill="#10b981" stroke="#022c22" strokeWidth="2" />
            <circle cx={nowPt[0]} cy={nowPt[1]} r="9"
              fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />

            {/* "Now" label */}
            <text x={nowPt[0]} y={PAD_T - 4} textAnchor="middle"
              fill="#10b981" fontSize="8" fontFamily="sans-serif" fontWeight="700">
              NOW
            </text>

            {/* X-axis labels */}
            {xLabels.map(i => (
              <text key={i} x={xOf(i)} y={PAD_T + CHART_H + 14} textAnchor="middle"
                fill="#475569" fontSize="8.5" fontFamily="sans-serif">
                {i === 0 ? "12a" : i === 12 ? "12p" : i < 12 ? `${i}a` : `${i - 12}p`}
              </text>
            ))}
          </svg>
        </div>

        {/* ── Period row ────────────────────────────────────────── */}
        <div className="px-4 pt-1 pb-3">
          <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Period (sec)</p>
          <div className="flex gap-1">
            {MOCK_DATA.map((d, i) => {
              const isPast = i <= NOW_IDX;
              const isNow = i === NOW_IDX;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded text-center text-[8px] font-semibold py-0.5"
                    style={{
                      background: isNow ? "#10b981" : isPast ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                      color: isNow ? "#022c22" : isPast ? "#6ee7b7" : "#374151",
                    }}
                  >
                    {d.wavePeriod}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Direction row ─────────────────────────────────────── */}
        <div className="px-4 pb-4">
          <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Direction</p>
          <div className="flex gap-2 flex-wrap">
            {[0, 4, 8, 12, 16, 20, 23].map(i => {
              const d = MOCK_DATA[i];
              const isPast = i <= NOW_IDX;
              const isNow = i === NOW_IDX;
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-slate-500">
                    {i === 0 ? "12a" : i === 12 ? "12p" : i < 12 ? `${i}a` : `${i - 12}p`}
                  </span>
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      background: isNow ? "#10b981" : isPast ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                      color: isNow ? "#022c22" : isPast ? "#34d399" : "#4b5563",
                      border: isNow ? "none" : isPast ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {d.waveDirection}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-slate-600 text-[9px]">Data from NOAA National Data Buoy Center</span>
          <span className="text-slate-700 text-[9px]">Updated 6 min ago</span>
        </div>

      </div>
    </div>
  );
}
