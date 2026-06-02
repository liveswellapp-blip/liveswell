import { Waves, Wind, ChevronLeft, Heart, Share2, Droplets } from "lucide-react";

export function QualityHero() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Hero Section */}
      <div className="relative mx-3 mt-2 rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #022c22 0%, #064e3b 40%, #0f3460 100%)", minHeight: 260 }}>

        {/* Wave animation lines */}
        <svg className="absolute bottom-0 left-0 right-0 opacity-20" viewBox="0 0 390 80" preserveAspectRatio="none">
          <path d="M0 40 Q50 20 100 40 T200 40 T300 40 T400 40 L400 80 L0 80Z" fill="#10b981" />
          <path d="M0 50 Q60 30 120 50 T240 50 T360 50 T480 50 L480 80 L0 80Z" fill="#059669" opacity="0.7" />
        </svg>

        {/* Back + actions */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Heart className="h-4 w-4 text-emerald-400" />
            </button>
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Spot name */}
        <div className="px-5 pt-3">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Half Moon Bay, CA</p>
          <h2 className="text-white font-black text-2xl mt-0.5">Mavericks</h2>
        </div>

        {/* Score */}
        <div className="flex items-end gap-4 px-5 pt-4 pb-6">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-emerald-400 font-black" style={{ fontSize: 80, lineHeight: 1 }}>7.2</span>
              <span className="text-emerald-500 font-bold text-2xl">/10</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full tracking-wide">GOOD</span>
              <span className="text-slate-300 text-xs">Updated 4 min ago</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <Waves className="h-4 w-4 text-emerald-400" />
              <span className="text-white font-bold text-sm">4–5 ft</span>
              <span className="text-slate-400 text-xs">@ 17s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-sky-400" />
              <span className="text-sky-300 font-bold text-sm">5 mph</span>
              <span className="text-slate-400 text-xs">Offshore</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-300 font-bold text-sm">58°F</span>
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Score Breakdown</p>
        {[
          { label: "Swell Height", score: 8, color: "bg-emerald-500" },
          { label: "Swell Period", score: 9, color: "bg-emerald-500" },
          { label: "Wind", score: 8, color: "bg-sky-500" },
          { label: "Tide", score: 5, color: "bg-amber-500" },
        ].map(({ label, score, color }) => (
          <div key={label} className="flex items-center gap-3 mb-2 last:mb-0">
            <span className="text-slate-300 text-xs w-28">{label}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score * 10}%` }} />
            </div>
            <span className="text-white text-xs font-bold w-4">{score}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-3 mt-3">
        <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm">
          View Full Conditions →
        </button>
      </div>
    </div>
  );
}
