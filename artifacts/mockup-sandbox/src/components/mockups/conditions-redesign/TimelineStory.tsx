import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, Heart, ChevronRight } from "lucide-react";

const hours = [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
const waveH = [3.5,4,4.5,5,5,4.5,4,3.5,3,3,2.5,2.5,3,3.5,4];
const windS = [3,4,5,5,5,6,7,8,10,12,11,10,9,8,7];
const tideH = [2,2.8,3.8,4.8,5.5,5.8,5.5,4.5,3.5,2.5,1.5,1.2,1.8,2.8,3.8];

const waveColor = (v: number) => v >= 4.5 ? "#10b981" : v >= 3.5 ? "#38bdf8" : "#f59e0b";
const windColor = (v: number) => v <= 6 ? "#10b981" : v <= 10 ? "#f59e0b" : "#ef4444";

const forecast = [
  { day: "Mon", wave: "4–5ft", score: 7, badge: "bg-emerald-500" },
  { day: "Tue", wave: "3–4ft", score: 6, badge: "bg-sky-500" },
  { day: "Wed", wave: "5–6ft", score: 9, badge: "bg-emerald-500" },
  { day: "Thu", wave: "2–3ft", score: 4, badge: "bg-amber-500" },
  { day: "Fri", wave: "3ft",   score: 5, badge: "bg-amber-500" },
];

const nearby = [
  { name: "Ocean Beach", dist: "3.2 mi", score: 6, color: "text-sky-400" },
  { name: "Baker Beach", dist: "5.1 mi", score: 5, color: "text-amber-400" },
  { name: "Linda Mar",   dist: "8.4 mi", score: 7, color: "text-emerald-400" },
];

function MiniBar({ values, color }: { values: number[]; color: (v: number) => string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${(v / max) * 32}px`, backgroundColor: color(v), opacity: 0.85 }} />
      ))}
    </div>
  );
}

export function TimelineStory() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero score + location */}
        <div className="mx-3 mt-1 rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 50%, #0c2340 100%)" }}>
          {/* Background wave lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 370 120" preserveAspectRatio="none">
            {[0,20,40].map(o => <path key={o} d={`M0 ${60+o} Q90 ${45+o} 185 ${60+o} T370 ${60+o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />)}
          </svg>

          <div className="relative px-5 pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Half Moon Bay, CA</span>
                </div>
                <h2 className="text-white font-black text-2xl">Mavericks</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="bg-emerald-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">GOOD</span>
                  <span className="text-slate-400 text-xs">Updated 4 min ago</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-emerald-400 font-black text-5xl leading-none">7.2</span>
                  <span className="text-emerald-600 font-bold text-xl">/10</span>
                </div>
                <button className="mt-1 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-auto">
                  <Heart className="h-4 w-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Key stats inline */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <Waves className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-white font-bold text-sm">4–5 ft</span>
                <span className="text-slate-400 text-xs">@ 17s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-sky-300 font-bold text-sm">5 mph</span>
                <span className="text-emerald-400 text-xs font-semibold">Offshore</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-white font-bold text-sm">58°F</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's data timeline */}
        <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-3">Today's Conditions by Hour</p>

          {/* Time axis */}
          <div className="flex items-center gap-0.5 mb-1">
            {hours.filter((_, i) => i % 3 === 0).map(h => (
              <div key={h} className="flex-1 text-center">
                <span className="text-slate-500 text-[9px]">{h > 12 ? `${h-12}p` : `${h}a`}</span>
              </div>
            ))}
            <div className="flex-1" /><div className="flex-1" />
          </div>

          {/* Wave bars */}
          <div className="mb-1"><div className="flex items-center gap-1 mb-1"><Waves className="h-2.5 w-2.5 text-emerald-400" /><span className="text-slate-500 text-[9px]">Waves</span></div>
            <MiniBar values={waveH} color={waveColor} /></div>

          {/* Wind bars */}
          <div className="mb-1 mt-2"><div className="flex items-center gap-1 mb-1"><Wind className="h-2.5 w-2.5 text-sky-400" /><span className="text-slate-500 text-[9px]">Wind</span></div>
            <MiniBar values={windS} color={windColor} /></div>

          {/* Tide curve */}
          <div className="mt-2"><div className="flex items-center gap-1 mb-1"><BarChart3 className="h-2.5 w-2.5 text-cyan-400" /><span className="text-slate-500 text-[9px]">Tide</span></div>
            <svg width="100%" height="28" viewBox="0 0 360 28" preserveAspectRatio="none">
              <defs><linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0" /></linearGradient></defs>
              {(() => {
                const pts = tideH.map((v, i) => `${(i/(tideH.length-1))*360},${28-(v/6)*24}`);
                const path = `M ${pts.join(" L ")}`;
                return <>
                  <path d={`${path} L 360,28 L 0,28 Z`} fill="url(#tg2)" />
                  <path d={path} stroke="#06b6d4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </>;
              })()}
            </svg>
          </div>

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/8">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-slate-500 text-[9px]">Epic</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-sky-500" /><span className="text-slate-500 text-[9px]">Good</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500" /><span className="text-slate-500 text-[9px]">Fair</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500" /><span className="text-slate-500 text-[9px]">Onshore</span></div>
          </div>
        </div>

        {/* Sun + UV row */}
        <div className="flex gap-2 mx-3 mt-2">
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <div className="flex items-center gap-1.5 mb-1"><Sun className="h-3.5 w-3.5 text-amber-400" /><span className="text-slate-400 text-[10px]">UV Index</span></div>
            <p className="text-amber-400 font-black text-xl">6</p>
            <p className="text-slate-400 text-[10px]">High · use SPF</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <p className="text-slate-400 text-[10px] mb-1">🌅 Sunrise</p>
            <p className="text-amber-400 font-bold text-sm">6:18 AM</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl border border-white/8 p-3">
            <p className="text-slate-400 text-[10px] mb-1">🌇 Sunset</p>
            <p className="text-orange-400 font-bold text-sm">8:24 PM</p>
          </div>
        </div>

        {/* AI summary */}
        <div className="mx-3 mt-2 bg-emerald-900/25 rounded-2xl border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-2"><Bot className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">AI Summary</span></div>
          <p className="text-slate-200 text-xs leading-relaxed">Solid overhead sets from the NW. Light offshore winds keeping faces clean. Best window is 7–10am before sea breeze arrives. Rising tide through the morning will help push in swell energy.</p>
        </div>

        {/* 5-day forecast */}
        <div className="mx-3 mt-2 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">5-Day Forecast</p>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="flex justify-between">
            {forecast.map(({ day, wave, score, badge }) => (
              <div key={day} className="flex flex-col items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">{day}</span>
                <div className={`w-8 h-8 rounded-xl ${badge} flex items-center justify-center`}>
                  <span className="text-white font-black text-sm">{score}</span>
                </div>
                <span className="text-white text-[10px] font-semibold">{wave}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby spots */}
        <div className="mx-3 mt-2 mb-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">Nearby Spots</p>
          <div className="space-y-1.5">
            {nearby.map(({ name, dist, score, color }) => (
              <div key={name} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5 border border-white/6">
                <p className="text-white text-sm font-semibold">{name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">{dist}</span>
                  <span className={`font-bold text-sm ${color}`}>{score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
