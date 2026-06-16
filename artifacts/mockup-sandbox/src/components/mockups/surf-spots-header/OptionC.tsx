import { Search, SlidersHorizontal, Waves } from "lucide-react";

export function OptionC() {
  return (
    <div className="min-h-screen" style={{ background: "#030a14" }}>
      <div className="relative overflow-hidden px-4 pt-6 pb-5"
        style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none select-none overflow-hidden">
          <span className="font-black text-[130px] leading-none text-white tracking-tighter"
            style={{ opacity: 0.035 }}>229</span>
        </div>
        <div className="absolute top-0 left-0 w-[3px] h-full"
          style={{ background: "linear-gradient(180deg, #f59e0b 0%, #ef4444 100%)" }} />
        <div className="relative max-w-2xl mx-auto pl-4">
          <div className="flex items-center gap-2 mb-2">
            <Waves size={13} className="text-amber-400" />
            <span className="text-amber-400 text-[10px] font-bold tracking-widest uppercase">Surf Discovery</span>
          </div>
          <h1 className="leading-none mb-4">
            <span className="block text-slate-400 font-black text-[12px] uppercase tracking-[0.2em]">Global</span>
            <span className="block text-white font-black text-[32px] leading-tight">Surf Spots</span>
          </h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                readOnly
                placeholder="Search spots, cities, regions…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] text-slate-300 placeholder-slate-600 outline-none"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <SlidersHorizontal size={14} className="text-amber-400" />
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <p className="text-slate-600 text-[11px] font-medium">Option C · Bold Editorial</p>
        <p className="text-slate-700 text-[10px] mt-0.5">Amber accent stripe, ghost "229" background art, stacked type treatment</p>
      </div>
    </div>
  );
}
