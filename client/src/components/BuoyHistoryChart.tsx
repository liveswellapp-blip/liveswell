interface HistoricalPoint {
  time: string;
  hour: number;
  date: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: string;
}

interface Props {
  stationId: string;
  stationName: string;
  dataSource: "noaa" | "simulated";
  historicalData: HistoricalPoint[];
  buoyIndex?: 1 | 2;
}

// ─── Chart geometry ───────────────────────────────────────────────────────────
const W = 560;
const H = 180;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 32;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

function xOf(i: number, total: number) {
  if (total <= 1) return PAD_L;
  return PAD_L + (i / (total - 1)) * CHART_W;
}
function yOf(v: number, minH: number, maxH: number) {
  return PAD_T + CHART_H - ((v - minH) / (maxH - minH)) * CHART_H;
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

export default function BuoyHistoryChart({ stationId, stationName, dataSource, historicalData, buoyIndex = 1 }: Props) {
  const color = buoyIndex === 1 ? "emerald" : "sky";

  const colorMap = {
    emerald: {
      dot: "#10b981",
      dotDark: "#059669",
      glow: "#34d399",
      label: "text-emerald-400",
      labelDark: "text-emerald-600",
      badge: "bg-emerald-900/60 text-emerald-400 border-emerald-700/40",
      gradId: "waveGradE",
      lineGradId: "lineGradE",
      past: { bg: "rgba(16,185,129,0.18)", text: "#6ee7b7" },
      now:  { bg: "#10b981", text: "#022c22" },
      future: { bg: "rgba(255,255,255,0.04)", text: "#374151" },
      borderPast: "rgba(16,185,129,0.2)",
      dirPast: "#34d399",
      tablePast: "text-emerald-500",
      tableNow: "text-emerald-400",
    },
    sky: {
      dot: "#38bdf8",
      dotDark: "#0284c7",
      glow: "#7dd3fc",
      label: "text-sky-400",
      labelDark: "text-sky-600",
      badge: "bg-sky-900/60 text-sky-400 border-sky-700/40",
      gradId: "waveGradS",
      lineGradId: "lineGradS",
      past: { bg: "rgba(56,189,248,0.18)", text: "#7dd3fc" },
      now:  { bg: "#38bdf8", text: "#082f49" },
      future: { bg: "rgba(255,255,255,0.04)", text: "#374151" },
      borderPast: "rgba(56,189,248,0.2)",
      dirPast: "#7dd3fc",
      tablePast: "text-sky-500",
      tableNow: "text-sky-400",
    },
  }[color];

  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">No historical data available for this buoy</div>
    );
  }

  // Sort oldest → newest so chart reads left → right
  const data = [...historicalData].sort((a, b) => a.hour - b.hour);
  const NOW_IDX = data.length - 1; // most recent = "now"

  const nowData = data[NOW_IDX];
  const heights = data.map(d => d.waveHeight);
  const MIN_H = 0;
  const MAX_H = Math.ceil(Math.max(...heights)) + 0.5;

  const points: [number, number][] = data.map((d, i) => [xOf(i, data.length), yOf(d.waveHeight, MIN_H, MAX_H)]);
  const nowPt = points[NOW_IDX];

  const gridLines: number[] = [];
  for (let v = 1; v <= Math.ceil(MAX_H); v++) gridLines.push(v);

  // X-axis labels: spread ~6 evenly
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabelIdxs = Array.from({ length: Math.ceil(data.length / step) }, (_, i) => Math.min(i * step, data.length - 1));
  if (!xLabelIdxs.includes(data.length - 1)) xLabelIdxs.push(data.length - 1);

  // Direction sample every ~4 entries
  const dirStep = Math.max(1, Math.floor(data.length / 7));
  const dirIdxs = Array.from({ length: Math.ceil(data.length / dirStep) }, (_, i) => Math.min(i * dirStep, data.length - 1));
  if (!dirIdxs.includes(NOW_IDX)) dirIdxs[dirIdxs.length - 1] = NOW_IDX;

  const nowPct = `${(NOW_IDX / Math.max(data.length - 1, 1)) * 100}%`;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full`} style={{ background: colorMap.dot, boxShadow: `0 0 6px ${colorMap.glow}` }} />
            <span className={`${colorMap.label} text-[11px] font-bold tracking-widest uppercase`}>Buoy #{buoyIndex}</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${colorMap.badge}`}>
              {dataSource === "noaa" ? "NOAA Live" : "Simulated"}
            </span>
          </div>
          <h2 className="text-white font-bold text-sm leading-tight">{stationName || `Station ${stationId}`}</h2>
          <p className="text-slate-500 text-[10px] mt-0.5">Station {stationId} · 24-hour history</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1 justify-end">
            <span className={`${colorMap.label} font-black text-3xl leading-none`}>{nowData.waveHeight.toFixed(1)}</span>
            <span className={`${colorMap.labelDark} text-sm font-semibold`}>ft</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <span className="text-slate-400 text-[10px]">{nowData.wavePeriod}s</span>
            <span className="text-slate-600 text-[10px]">·</span>
            <span className="text-slate-400 text-[10px]">{nowData.waveDirection}</span>
          </div>
          <p className="text-slate-600 text-[9px] mt-0.5">latest · {nowData.time}</p>
        </div>
      </div>

      {/* ── Wave height chart ── */}
      <div className="mb-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Wave Height</span>
          <span className="text-slate-600 text-[10px]">ft</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id={colorMap.gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorMap.dot} stopOpacity="0.35" />
              <stop offset="100%" stopColor={colorMap.dot} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={colorMap.lineGradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colorMap.dotDark} />
              <stop offset={nowPct} stopColor={colorMap.dot} />
              <stop offset="100%" stopColor={colorMap.glow} stopOpacity="0.4" />
            </linearGradient>
            <clipPath id={`pastClip-${stationId}`}><rect x={0} y={0} width={nowPt[0]} height={H} /></clipPath>
          </defs>

          {gridLines.map(v => (
            <g key={v}>
              <line x1={PAD_L} y1={yOf(v, MIN_H, MAX_H)} x2={PAD_L + CHART_W} y2={yOf(v, MIN_H, MAX_H)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={PAD_L - 6} y={yOf(v, MIN_H, MAX_H) + 3.5} textAnchor="end" fill="#475569" fontSize="9" fontFamily="sans-serif">{v}</text>
            </g>
          ))}
          <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          <path d={areaPath(points)} fill={`url(#${colorMap.gradId})`} />
          <path d={smoothPath(points)} fill="none" stroke={`url(#${colorMap.lineGradId})`} strokeWidth="2" strokeLinecap="round" />

          {/* Dots every ~4 entries */}
          {points.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === NOW_IDX).map(([cx, cy], dotI) => {
            const srcI = dotI * Math.max(1, Math.floor(data.length / 6));
            const isNow = srcI === NOW_IDX || dotI === 0 && NOW_IDX === 0;
            return (
              <circle key={dotI} cx={cx} cy={cy} r={isNow ? 0 : 3}
                fill={colorMap.dot} stroke={colorMap.dotDark} strokeWidth="1.5" />
            );
          })}

          {/* Now vertical line */}
          <line x1={nowPt[0]} y1={PAD_T} x2={nowPt[0]} y2={PAD_T + CHART_H} stroke={colorMap.dot} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="5" fill={colorMap.dot} stroke="#030f1c" strokeWidth="2" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="9" fill="none" stroke={colorMap.dot} strokeWidth="1" opacity="0.3" />
          <text x={nowPt[0]} y={PAD_T - 4} textAnchor="middle" fill={colorMap.dot} fontSize="8" fontFamily="sans-serif" fontWeight="700">NOW</text>

          {xLabelIdxs.map(i => (
            <text key={i} x={xOf(i, data.length)} y={PAD_T + CHART_H + 14} textAnchor="middle" fill="#475569" fontSize="8.5" fontFamily="sans-serif">
              {data[i].time.replace(":00 ", "").toLowerCase()}
            </text>
          ))}
        </svg>
      </div>

      {/* ── Period row ── */}
      <div className="mb-3">
        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Period (sec)</p>
        <div className="flex gap-0.5">
          {data.map((d, i) => {
            const isNow = i === NOW_IDX;
            return (
              <div key={i} className="flex-1">
                <div className="w-full rounded text-center text-[7px] font-semibold py-0.5" style={{
                  background: isNow ? colorMap.dot : colorMap.past.bg,
                  color: isNow ? colorMap.now.text : colorMap.past.text,
                }}>{d.wavePeriod}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Direction row ── */}
      <div className="mb-4 pb-4 border-b border-white/5">
        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Direction</p>
        <div className="flex gap-1.5 flex-wrap">
          {dirIdxs.map(i => {
            const d = data[i];
            const isNow = i === NOW_IDX;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-slate-500">{d.time.replace(":00 ", "").toLowerCase()}</span>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                  background: isNow ? colorMap.dot : colorMap.past.bg,
                  color: isNow ? colorMap.now.text : colorMap.dirPast,
                  border: isNow ? "none" : `1px solid ${colorMap.borderPast}`,
                }}>{d.waveDirection}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Data table ── */}
      <div>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-2">All Readings</p>
        <div className="rounded-xl overflow-hidden border border-white/6">
          <div className="grid grid-cols-4 px-3 py-2" style={{ background: `rgba(${color === "emerald" ? "16,185,129" : "56,189,248"},0.08)` }}>
            {["Time", "Height", "Period", "Direction"].map(h => (
              <span key={h} className={`${colorMap.label} text-[9px] font-bold uppercase tracking-wider opacity-70`}>{h}</span>
            ))}
          </div>
          <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {[...data].reverse().map((d, revI) => {
              const i = data.length - 1 - revI;
              const isNow = i === NOW_IDX;
              return (
                <div key={i} className="grid grid-cols-4 px-3 py-2 border-t border-white/4"
                  style={{ background: isNow ? `rgba(${color === "emerald" ? "16,185,129" : "56,189,248"},0.10)` : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${isNow ? colorMap.tableNow : "text-slate-400"}`}>{d.time}</span>
                    {isNow && <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full leading-none`} style={{ background: colorMap.dot, color: colorMap.now.text }}>NOW</span>}
                  </div>
                  <span className={`text-[10px] font-bold ${isNow ? colorMap.tableNow : colorMap.tablePast}`}>{d.waveHeight.toFixed(1)} ft</span>
                  <span className={`text-[10px] ${isNow ? "text-sky-400" : "text-slate-400"}`}>{d.wavePeriod}s</span>
                  <span className={`text-[10px] ${isNow ? "text-teal-400" : "text-slate-400"}`}>{d.waveDirection}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
