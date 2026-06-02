import { ChevronLeft, Waves, BarChart3, Droplets } from "lucide-react";

function CompassRose({ windDeg, speed, label }: { windDeg: number; speed: string; label: string }) {
  const arrowRad = (windDeg * Math.PI) / 180;
  const cx = 70, cy = 70, r = 50;
  const arrowLen = 32;
  const ax = cx + Math.sin(arrowRad) * arrowLen;
  const ay = cy - Math.cos(arrowRad) * arrowLen;

  const isOffshore = label === "Offshore";

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

        {/* Cardinal labels */}
        {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([dir, deg]) => {
          const rad = (Number(deg) * Math.PI) / 180;
          const lx = cx + Math.sin(rad) * (r + 8);
          const ly = cy - Math.cos(rad) * (r + 8);
          return <text key={dir} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill="#64748b" fontSize="10" fontWeight="600">{dir}</text>;
        })}

        {/* Tick marks */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const x1 = cx + Math.sin(a) * (r - 4);
          const y1 = cy - Math.cos(a) * (r - 4);
          const x2 = cx + Math.sin(a) * r;
          const y2 = cy - Math.cos(a) * r;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="1" />;
        })}

        {/* Shaded offshore arc (behind the beach) — W to NE sector for this example */}
        <path d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * 0.707} ${cy - r * 0.707} Z`}
          fill="#10b981" opacity="0.08" />

        {/* Wind arrow */}
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={isOffshore ? "#10b981" : "#f59e0b"} strokeWidth="3" strokeLinecap="round" />
        <circle cx={ax} cy={ay} r="4" fill={isOffshore ? "#10b981" : "#f59e0b"} />
        <circle cx={cx} cy={cy} r="3" fill="#e2e8f0" />

        {/* Speed label in center */}
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#94a3b8" fontSize="9">{speed}</text>
      </svg>

      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOffshore ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOffshore ? "bg-emerald-400" : "bg-amber-400"}`} />
        {label}
      </div>
    </div>
  );
}

export function WindRose() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-base">Mavericks — Wind</p>
          <p className="text-slate-400 text-xs">Live conditions</p>
        </div>
      </div>

      {/* Main compass card */}
      <div className="mx-3 bg-slate-800/60 rounded-2xl border border-white/8 p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Wind Direction</p>
            <p className="text-white font-black text-3xl mt-1">5 mph</p>
            <p className="text-slate-400 text-sm">North (N) — 360°</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Gusts</p>
            <p className="text-white font-bold text-lg">8 mph</p>
          </div>
        </div>

        <div className="flex justify-center mt-2">
          <CompassRose windDeg={0} speed="5 mph" label="Offshore" />
        </div>

        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-emerald-400 text-[10px] uppercase tracking-wide font-semibold">Offshore Zone</p>
            <p className="text-slate-300 text-xs mt-1">NW · N · NE winds are offshore at Mavericks</p>
          </div>
          <div className="flex-1 bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-amber-400 text-[10px] uppercase tracking-wide font-semibold">Now</p>
            <p className="text-emerald-300 text-xs font-bold mt-1">✓ Offshore</p>
            <p className="text-slate-400 text-[10px]">Clean face conditions</p>
          </div>
        </div>
      </div>

      {/* Wind forecast */}
      <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-3">Wind Forecast (Today)</p>
        <div className="space-y-2">
          {[
            { time: "6 AM", speed: "3 mph", dir: "NNW", status: "Offshore", color: "text-emerald-400" },
            { time: "9 AM", speed: "5 mph", dir: "N", status: "Offshore", color: "text-emerald-400" },
            { time: "12 PM", speed: "8 mph", dir: "NW", status: "Offshore", color: "text-emerald-400" },
            { time: "3 PM", speed: "12 mph", dir: "SW", status: "Onshore", color: "text-amber-400" },
            { time: "6 PM", speed: "9 mph", dir: "SSW", status: "Onshore", color: "text-amber-400" },
          ].map(({ time, speed, dir, status, color }) => (
            <div key={time} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-10">{time}</span>
              <span className="text-white text-xs font-semibold w-12">{speed}</span>
              <span className="text-slate-400 text-xs w-6">{dir}</span>
              <span className={`text-xs font-semibold ${color}`}>{status}</span>
              <div className={`ml-auto w-1.5 h-1.5 rounded-full ${color === "text-emerald-400" ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Other conditions row */}
      <div className="flex gap-2 mx-3 mt-3">
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/8 text-center">
          <Waves className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-white text-xs font-bold">4–5 ft</p>
          <p className="text-slate-500 text-[10px]">WSW @ 17s</p>
        </div>
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/8 text-center">
          <BarChart3 className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-white text-xs font-bold">Rising</p>
          <p className="text-slate-500 text-[10px]">+1.2 ft</p>
        </div>
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/8 text-center">
          <Droplets className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-white text-xs font-bold">58°F</p>
          <p className="text-slate-500 text-[10px]">Water temp</p>
        </div>
      </div>
    </div>
  );
}
