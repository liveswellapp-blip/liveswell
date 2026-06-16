import { Search, SlidersHorizontal } from "lucide-react";

export function OptionA() {
  return (
    <div className="min-h-screen" style={{ background: "#030a14" }}>
      <div className="px-4 pt-6 pb-5" style={{ background: "#030912", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">229 Surf Spots Worldwide</span>
          </div>
          <h1 className="text-white font-black text-3xl leading-tight mb-1">Global Surf Spots</h1>
          <p className="text-slate-500 text-[12px] mb-4">Explore breaks across 6 continents</p>
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
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <SlidersHorizontal size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <p className="text-slate-600 text-[11px] font-medium">Option A · Minimal Dark</p>
        <p className="text-slate-700 text-[10px] mt-0.5">Clean green badge, subtitle line, no decorative elements</p>
      </div>
    </div>
  );
}
