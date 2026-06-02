interface WindPoint {
  time: string;
  hour: number;
  date: string;
  windSpeed: number;
  windDirection: string;
  windGusts: number;
}

interface Props {
  locationName: string;
  forecastData: WindPoint[];
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
function yOf(v: number, maxV: number) {
  return PAD_T + CHART_H - (v / maxV) * CHART_H;
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

export default function WindForecastChart({ locationName, forecastData }: Props) {
  if (!forecastData || forecastData.length === 0) {
    return <div className="py-12 text-center text-slate-500 text-sm">No wind forecast data available</div>;
  }

  const data = forecastData.slice(0, 48);
  const NOW_IDX = 0; // First entry = nearest forecast hour

  const speeds = data.map(d => d.windSpeed);
  const gusts  = data.map(d => d.windGusts);
  const maxGust  = Math.max(...gusts);
  const maxV     = Math.ceil(maxGust) + 3;

  const speedPts: [number, number][] = data.map((d, i) => [xOf(i, data.length), yOf(d.windSpeed, maxV)]);
  const gustPts:  [number, number][] = data.map((d, i) => [xOf(i, data.length), yOf(d.windGusts, maxV)]);

  // Y-axis grid lines every 5 mph
  const gridLines: number[] = [];
  for (let v = 5; v <= maxV; v += 5) gridLines.push(v);

  // X-axis labels evenly spread
  const step = Math.max(1, Math.floor(data.length / 7));
  const xLabelIdxs = Array.from({ length: Math.ceil(data.length / step) }, (_, i) => Math.min(i * step, data.length - 1));
  if (!xLabelIdxs.includes(data.length - 1)) xLabelIdxs.push(data.length - 1);

  // Find where "Tomorrow" starts
  const tomorrowIdx = data.findIndex((d, i) => i > 0 && d.date !== data[0].date);

  // Direction sample indices
  const dirStep = Math.max(1, Math.floor(data.length / 12));
  const dirIdxs = Array.from({ length: Math.ceil(data.length / dirStep) }, (_, i) => Math.min(i * dirStep, data.length - 1));

  const nowPt   = speedPts[NOW_IDX];
  const nowData = data[NOW_IDX];

  const avgSpeed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #22d3ee" }} />
            <span className="text-cyan-400 text-[11px] font-bold tracking-widest uppercase">Wind Forecast</span>
            <span className="bg-cyan-900/60 text-cyan-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-cyan-700/40">OpenWeatherMap</span>
          </div>
          <h2 className="text-white font-bold text-sm leading-tight">{locationName}</h2>
          <p className="text-slate-500 text-[10px] mt-0.5">48-hour forecast · {data[0].date} – {data[data.length - 1].date}</p>
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
          <p className="text-slate-600 text-[9px] mt-0.5">next · {nowData.time}</p>
        </div>
      </div>

      {/* ── Peak stats row ── */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-cyan-900/20 border border-cyan-700/20 rounded-lg px-3 py-2">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Peak Speed</p>
          <div className="flex items-baseline gap-1">
            <span className="text-cyan-400 font-bold text-sm">{Math.max(...speeds)}</span>
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
            <span className="text-cyan-400 font-bold text-sm">{avgSpeed}</span>
            <span className="text-cyan-700 text-[10px]">mph</span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="mb-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-cyan-400 rounded" />
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-[1px] border-t border-dashed border-cyan-400/50" />
            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Gusts</span>
          </div>
          <span className="text-slate-600 text-[10px] ml-auto">mph</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="wfSpeedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="wfGustGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="wfLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map(v => (
            <g key={v}>
              <line x1={PAD_L} y1={yOf(v, maxV)} x2={PAD_L + CHART_W} y2={yOf(v, maxV)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={PAD_L - 6} y={yOf(v, maxV) + 3.5} textAnchor="end" fill="#475569" fontSize="9" fontFamily="sans-serif">{v}</text>
            </g>
          ))}
          <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          {/* Today / Tomorrow divider */}
          {tomorrowIdx > 0 && (
            <>
              <line x1={xOf(tomorrowIdx, data.length)} y1={PAD_T} x2={xOf(tomorrowIdx, data.length)} y2={PAD_T + CHART_H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
              <text x={xOf(Math.floor(tomorrowIdx / 2), data.length)} y={PAD_T - 5} textAnchor="middle" fill="#334155" fontSize="8" fontFamily="sans-serif">TODAY</text>
              <text x={xOf(tomorrowIdx + Math.floor((data.length - tomorrowIdx) / 2), data.length)} y={PAD_T - 5} textAnchor="middle" fill="#334155" fontSize="8" fontFamily="sans-serif">TOMORROW</text>
            </>
          )}

          {/* Gust area + dashed line */}
          <path d={areaPath(gustPts)} fill="url(#wfGustGrad)" />
          <path d={smoothPath(gustPts)} fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Speed area + solid line */}
          <path d={areaPath(speedPts)} fill="url(#wfSpeedGrad)" />
          <path d={smoothPath(speedPts)} fill="none" stroke="url(#wfLineGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Dots at label positions */}
          {xLabelIdxs.map(i => {
            const [cx, cy] = speedPts[i];
            const isNow = i === NOW_IDX;
            return <circle key={i} cx={cx} cy={cy} r={isNow ? 0 : 3} fill="#22d3ee" stroke="#0891b2" strokeWidth="1.5" />;
          })}

          {/* NOW marker */}
          <line x1={nowPt[0]} y1={PAD_T} x2={nowPt[0]} y2={PAD_T + CHART_H} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="5" fill="#22d3ee" stroke="#030f1c" strokeWidth="2" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="9" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
          <text x={nowPt[0]} y={PAD_T - 4} textAnchor="middle" fill="#22d3ee" fontSize="8" fontFamily="sans-serif" fontWeight="700">NEXT</text>

          {/* X-axis labels */}
          {xLabelIdxs.map(i => (
            <text key={i} x={xOf(i, data.length)} y={PAD_T + CHART_H + 14} textAnchor="middle" fill="#475569" fontSize="8.5" fontFamily="sans-serif">
              {data[i].time.replace(":00 ", "").toLowerCase()}
            </text>
          ))}
        </svg>
      </div>

      {/* ── Gusts bar row ── */}
      <div className="mb-3">
        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-semibold mb-1.5">Gusts (mph)</p>
        <div className="flex gap-0.5">
          {data.map((d, i) => {
            const isNow = i === NOW_IDX;
            const intensity = d.windGusts / maxGust;
            return (
              <div key={i} className="flex-1">
                <div className="w-full rounded text-center text-[7px] font-semibold py-0.5" style={{
                  background: isNow
                    ? "#22d3ee"
                    : `rgba(34,211,238,${0.05 + intensity * 0.25})`,
                  color: isNow ? "#021825" : "#67e8f9",
                }}>{i % 4 === 0 || isNow ? d.windGusts : ""}</div>
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
                <span className="text-[8px] text-slate-600">{d.time.replace(":00 ", "").toLowerCase()}</span>
                <div className="px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{
                  background: isNow ? "#22d3ee" : "rgba(34,211,238,0.12)",
                  color: isNow ? "#021825" : "#67e8f9",
                  border: isNow ? "none" : "1px solid rgba(34,211,238,0.2)",
                }}>{d.windDirection}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Data table ── */}
      <div>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-2">All Readings</p>
        <div className="rounded-xl overflow-hidden border border-white/[0.06]">
          <div className="grid grid-cols-4 px-3 py-2" style={{ background: "rgba(34,211,238,0.07)" }}>
            {["Time", "Speed", "Gusts", "Direction"].map(h => (
              <span key={h} className="text-cyan-700 text-[9px] font-bold uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#0c3040 transparent" }}>
            {data.map((d, i) => {
              const isNow = i === NOW_IDX;
              const showDate = i === 0 || d.date !== data[i - 1].date;
              return (
                <div key={i}>
                  {showDate && (
                    <div className="px-3 py-1" style={{ background: "rgba(34,211,238,0.04)" }}>
                      <span className="text-cyan-800 text-[8px] font-bold uppercase tracking-widest">{d.date}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 px-3 py-2 border-t border-white/[0.04]" style={{
                    background: isNow ? "rgba(34,211,238,0.1)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${isNow ? "text-cyan-300" : "text-slate-400"}`}>{d.time}</span>
                      {isNow && <span className="text-[7px] bg-cyan-500 text-black font-bold px-1 py-0.5 rounded-full leading-none">NEXT</span>}
                    </div>
                    <span className={`text-[10px] font-bold ${isNow ? "text-cyan-400" : "text-cyan-600"}`}>{d.windSpeed} mph</span>
                    <span className={`text-[10px] ${isNow ? "text-cyan-300" : "text-slate-400"}`}>{d.windGusts} mph</span>
                    <span className={`text-[10px] ${isNow ? "text-sky-400" : "text-slate-400"}`}>{d.windDirection}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
