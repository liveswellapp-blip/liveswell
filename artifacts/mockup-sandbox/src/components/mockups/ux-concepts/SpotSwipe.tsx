import { ChevronLeft, ChevronRight, Waves, Wind, BarChart3, Heart, Map } from "lucide-react";

const spots = [
  { name: "Mavericks", city: "Half Moon Bay, CA", wave: "4–5 ft", period: "17s", wind: "5 mph N", tide: "High 2:20 PM", score: 7.2, quality: "GOOD", color: "#10b981", bg: "from-emerald-950 to-slate-900" },
  { name: "Trestles", city: "San Clemente, CA", wave: "4 ft", period: "17s", wind: "2 mph SE", tide: "High 2:20 PM", score: 8.1, quality: "EPIC", color: "#10b981", bg: "from-emerald-950 to-slate-900" },
  { name: "Pipeline", city: "Oahu, HI", wave: "6–8 ft", period: "14s", wind: "3 mph NE", tide: "Low 1:10 PM", score: 9.4, quality: "EPIC", color: "#10b981", bg: "from-emerald-950 to-slate-900" },
  { name: "Cocoa Beach", city: "Cocoa Beach, FL", wave: "2–3 ft", period: "12s", wind: "7 mph NE", tide: "High 5:20 PM", score: 5.1, quality: "FAIR", color: "#f59e0b", bg: "from-amber-950 to-slate-900" },
  { name: "Folly Beach", city: "Charleston, SC", wave: "5–6 ft", period: "5s", wind: "2 mph N", tide: "High 5:20 PM", score: 6.2, quality: "GOOD", color: "#38bdf8", bg: "from-sky-950 to-slate-900" },
];

const active = 1; // Trestles is currently shown

export function SpotSwipe() {
  const spot = spots[active];

  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Swipe navigation header */}
      <div className="flex items-center justify-between px-2 py-2">
        <button className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-white/10">
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>

        <div className="text-center flex-1 px-2">
          <p className="text-white font-bold text-base leading-tight">{spot.name}</p>
          <p className="text-slate-400 text-xs">{spot.city}</p>
          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-1.5">
            {spots.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i === active ? "w-4 h-1.5 bg-emerald-400" : "w-1.5 h-1.5 bg-slate-600"}`} />
            ))}
          </div>
        </div>

        <button className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-white/10">
          <ChevronRight className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Spot label */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-slate-400 text-xs">Spot {active + 1} of {spots.length} saved</span>
        <span className="text-slate-400 text-xs">Swipe to compare →</span>
      </div>

      {/* Hero score */}
      <div className={`mx-3 rounded-2xl bg-gradient-to-br ${spot.bg} border border-white/8 p-5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-5xl" style={{ color: spot.color }}>{spot.score}</span>
              <span className="text-slate-400 font-bold text-lg">/10</span>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full text-white mt-1 inline-block"
              style={{ backgroundColor: spot.color }}>{spot.quality}</span>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Heart className="h-4 w-4 text-emerald-400 fill-emerald-400" />
            </button>
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Map className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Waves className="h-3 w-3 text-emerald-400" />
              <span className="text-slate-400 text-[10px]">Waves</span>
            </div>
            <p className="text-white font-bold text-sm">{spot.wave}</p>
            <p className="text-slate-500 text-[10px]">@ {spot.period}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Wind className="h-3 w-3 text-sky-400" />
              <span className="text-slate-400 text-[10px]">Wind</span>
            </div>
            <p className="text-white font-bold text-sm">{spot.wind}</p>
            <p className="text-emerald-400 text-[10px]">Offshore</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <BarChart3 className="h-3 w-3 text-cyan-400" />
              <span className="text-slate-400 text-[10px]">Tide</span>
            </div>
            <p className="text-white font-bold text-sm">Rising</p>
            <p className="text-slate-500 text-[10px]">{spot.tide}</p>
          </div>
        </div>
      </div>

      {/* All saved spots mini-list */}
      <div className="mx-3 mt-3">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Your Saved Spots</p>
        <div className="space-y-1.5">
          {spots.map((s, i) => (
            <div key={s.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${i === active ? "bg-slate-700/60 border-emerald-500/40" : "bg-slate-800/40 border-white/5"}`}>
              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${i === active ? "text-white" : "text-slate-400"}`}>{s.name}</p>
                <p className="text-slate-500 text-[10px]">{s.city}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: s.color }}>{s.score}</p>
                <p className="text-[10px] font-bold" style={{ color: s.color }}>{s.quality}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
