import { Search, SlidersHorizontal, Globe } from "lucide-react";

export function OptionB() {
  return (
    <div className="min-h-screen" style={{ background: "#030a14" }}>
      <div className="relative overflow-hidden px-4 pt-7 pb-6"
        style={{ background: "linear-gradient(135deg, #022b22 0%, #041a2e 55%, #030a14 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute bottom-0 left-0 w-full opacity-25" viewBox="0 0 1200 80" preserveAspectRatio="none">
            <path d="M0 40 Q200 10 400 40 T800 40 T1200 40 L1200 80 L0 80 Z" fill="#10b981" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1200 80" preserveAspectRatio="none">
            <path d="M0 55 Q300 25 600 55 T1200 55 L1200 80 L0 80 Z" fill="#34d399" />
          </svg>
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Globe size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl leading-none">Global Surf Spots</h1>
              <p className="text-emerald-500 text-[10px] font-bold tracking-widest mt-1">229 BREAKS · 6 CONTINENTS</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
              <input
                readOnly
                placeholder="Search spots, cities, regions…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] text-slate-300 placeholder-slate-600 outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.2)" }}
              />
            </div>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <SlidersHorizontal size={14} className="text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <p className="text-slate-600 text-[11px] font-medium">Option B · Ocean Gradient</p>
        <p className="text-slate-700 text-[10px] mt-0.5">Teal-to-navy wash, wave fill at bottom, globe icon, green-tinted search</p>
      </div>
    </div>
  );
}
