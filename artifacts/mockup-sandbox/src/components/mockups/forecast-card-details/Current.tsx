import "./_group.css";

const day = {
  date: "Tomorrow",
  waveHeight: "3–4 ft",
  wavePeriod: "10 sec",
  windSpeed: "9 mph",
  windDirection: "NW",
  sunrise: "6:22 AM",
  sunset: "8:15 PM",
};

function TideChartPreview() {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-slate-950">
      <div className="h-[120px] relative overflow-hidden">
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="current-tide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 62 C28 24 60 25 88 64 S146 105 178 57 S238 16 268 58 S306 95 320 70 L320 120 L0 120 Z" fill="url(#current-tide)" />
          <path d="M0 62 C28 24 60 25 88 64 S146 105 178 57 S238 16 268 58 S306 95 320 70" fill="none" stroke="#10b981" strokeWidth="2" />
          {[55, 156, 238, 302].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="120" stroke="#10b981" strokeWidth="0.5" opacity="0.25" />)}
        </svg>
      </div>
      <div className="h-6 px-3 flex items-center justify-between border-t border-white/[0.07] text-[8px] font-medium text-slate-500">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
      </div>
    </div>
  );
}

export function Current() {
  return (
    <main className="forecast-card-preview min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-[420px]">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Current 5-day card</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.18]" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
          <div className="border-b border-white/5 px-4 pb-3 pt-4">
            <span className="text-sm font-bold text-emerald-400">{day.date}</span>
          </div>
          <div className="flex gap-4 px-4 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Wave</p>
              <p className="mb-1 text-[26px] font-black leading-none text-emerald-400">{day.waveHeight}</p>
              <p className="text-[13px] font-semibold text-slate-500">{day.wavePeriod}</p>
            </div>
            <div className="w-px bg-white/5" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Wind</p>
              <p className="mb-1 text-[26px] font-bold leading-none text-cyan-400">{day.windSpeed}</p>
              <p className="text-[13px] text-slate-400">{day.windDirection}</p>
            </div>
          </div>
          <div className="mt-auto px-3 pb-2"><TideChartPreview /></div>
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] px-4 pb-3 pt-2">
            <span className="text-[11px] text-slate-400"><b className="mr-1.5 text-[10px] uppercase tracking-wider text-slate-500">Sunrise</b>{day.sunrise}</span>
            <span className="text-[11px] text-slate-400"><b className="mr-1.5 text-[10px] uppercase tracking-wider text-slate-500">Sunset</b>{day.sunset}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-600">The original full-width card displays all of its content before users can scan another day.</p>
      </div>
    </main>
  );
}