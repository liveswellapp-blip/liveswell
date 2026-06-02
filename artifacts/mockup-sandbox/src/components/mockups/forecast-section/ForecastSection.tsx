import { Waves, Wind, ChevronRight } from "lucide-react";

const DAYS = [
  {
    day: "Today",
    date: "Jun 2",
    waveHeight: "2–3",
    wavePeriod: 8,
    windSpeed: 12,
    windDirection: "SSW",
    windLabel: "Onshore",
    tides: [0.4, 0.6, 1.1, 1.6, 1.8, 1.5, 1.1, 0.7, 0.3, 0.2, 0.4, 0.9, 1.4, 1.7, 1.6, 1.2, 0.8, 0.5, 0.4, 0.6, 1.0, 1.4, 1.5, 1.2],
    highTide: "7:14 AM",
    lowTide: "1:22 PM",
  },
  {
    day: "Tue",
    date: "Jun 3",
    waveHeight: "3–4",
    wavePeriod: 10,
    windSpeed: 9,
    windDirection: "NW",
    windLabel: "Offshore",
    tides: [0.5, 0.8, 1.3, 1.7, 1.9, 1.6, 1.2, 0.8, 0.4, 0.3, 0.5, 1.0, 1.5, 1.8, 1.7, 1.3, 0.9, 0.6, 0.5, 0.7, 1.1, 1.5, 1.6, 1.3],
    highTide: "8:02 AM",
    lowTide: "2:10 PM",
  },
  {
    day: "Wed",
    date: "Jun 4",
    waveHeight: "4–5",
    wavePeriod: 12,
    windSpeed: 7,
    windDirection: "WNW",
    windLabel: "Offshore",
    tides: [0.6, 0.9, 1.4, 1.8, 2.0, 1.7, 1.3, 0.9, 0.5, 0.4, 0.6, 1.1, 1.6, 1.9, 1.8, 1.4, 1.0, 0.7, 0.6, 0.8, 1.2, 1.6, 1.7, 1.4],
    highTide: "8:48 AM",
    lowTide: "2:55 PM",
  },
  {
    day: "Thu",
    date: "Jun 5",
    waveHeight: "3–4",
    wavePeriod: 11,
    windSpeed: 11,
    windDirection: "W",
    windLabel: "Side-off",
    tides: [0.5, 0.8, 1.2, 1.7, 1.8, 1.5, 1.1, 0.7, 0.4, 0.3, 0.5, 1.0, 1.4, 1.7, 1.6, 1.2, 0.8, 0.6, 0.5, 0.7, 1.1, 1.4, 1.5, 1.2],
    highTide: "9:31 AM",
    lowTide: "3:40 PM",
  },
  {
    day: "Fri",
    date: "Jun 6",
    waveHeight: "2–3",
    wavePeriod: 9,
    windSpeed: 14,
    windDirection: "SW",
    windLabel: "Onshore",
    tides: [0.4, 0.7, 1.1, 1.5, 1.7, 1.4, 1.0, 0.6, 0.3, 0.2, 0.4, 0.8, 1.3, 1.6, 1.5, 1.1, 0.7, 0.5, 0.4, 0.6, 1.0, 1.3, 1.4, 1.1],
    highTide: "10:15 AM",
    lowTide: "4:22 PM",
  },
];

function TideSparkline({ tides }: { tides: number[] }) {
  const W = 140, H = 44;
  const PAD = 4;
  const min = Math.min(...tides);
  const max = Math.max(...tides);
  const pts: [number, number][] = tides.map((v, i) => [
    PAD + (i / (tides.length - 1)) * (W - PAD * 2),
    H - PAD - ((v - min) / (max - min)) * (H - PAD * 2),
  ]);
  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    path += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const area = `${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="tideG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tideG)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function windColor(label: string) {
  if (label === "Offshore") return { text: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.25)" };
  if (label === "Onshore") return { text: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.2)" };
  return { text: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.2)" };
}

export default function ForecastSection() {
  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-6 pt-8">
      <div style={{ width: 960 }}>

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">5-Day Surf Forecast</span>
          </div>
          <span className="text-slate-600 text-[10px]">Cocoa Beach, FL</span>
        </div>

        {/* ── Day cards ── */}
        <div className="flex gap-3">
          {DAYS.map((day, di) => {
            const isToday = di === 0;
            const wc = windColor(day.windLabel);
            return (
              <div
                key={di}
                className="flex-1 rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: isToday
                    ? "linear-gradient(160deg, #04202e 0%, #053040 100%)"
                    : "linear-gradient(160deg, #030f1c 0%, #041a2e 100%)",
                  border: isToday
                    ? "1px solid rgba(16,185,129,0.25)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Card top */}
                <div className="px-3 pt-3 pb-2 border-b border-white/5">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-emerald-400" : "text-slate-300"}`}>
                      {day.day}
                    </span>
                    <span className="text-slate-600 text-[10px]">{day.date}</span>
                  </div>
                </div>

                {/* Wave height */}
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-emerald-400 font-black text-2xl leading-none">{day.waveHeight}</span>
                    <span className="text-emerald-700 text-[11px] font-semibold">ft</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-teal-500 text-[10px] font-semibold">{day.wavePeriod}s</span>
                    <span className="text-slate-600 text-[9px]">period</span>
                  </div>
                </div>

                {/* Wind */}
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: wc.text }} className="text-[10px] font-bold">{day.windSpeed} mph</span>
                    <span className="text-slate-600 text-[9px]">{day.windDirection}</span>
                    <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full font-semibold" style={{
                      background: wc.bg, color: wc.text, border: `1px solid ${wc.border}`
                    }}>{day.windLabel}</span>
                  </div>
                </div>

                {/* Tide sparkline */}
                <div className="px-2 pb-2 mt-auto">
                  <TideSparkline tides={day.tides} />
                  <div className="flex justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-400" />
                      <span className="text-[8px] text-slate-500">H {day.highTide}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-slate-500" />
                      <span className="text-[8px] text-slate-500">L {day.lowTide}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer note ── */}
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
