import { useState } from "react";
import { MapPin, Waves, Wind, Search, Heart, ChevronDown, ChevronRight } from "lucide-react";

const SAVED = [
  { id: 1, name: "Mavericks", city: "Half Moon Bay, CA", wave: "8–12 ft", wind: "12 mph NW" },
  { id: 2, name: "Pipeline", city: "Haleiwa, HI", wave: "6–10 ft", wind: "8 mph E" },
];

const REGIONS: { name: string; count: number; spots: { id: number; name: string; city: string; difficulty: string; wave: string; wind: string }[] }[] = [
  {
    name: "Southern California", count: 3,
    spots: [
      { id: 3, name: "Trestles", city: "San Clemente", difficulty: "Intermediate", wave: "3–5 ft", wind: "7 mph NW" },
      { id: 4, name: "Rincon", city: "Carpinteria", difficulty: "Beginner", wave: "4–6 ft", wind: "5 mph N" },
      { id: 5, name: "Huntington Beach", city: "Huntington Beach", difficulty: "Beginner", wave: "3–4 ft", wind: "6 mph SW" },
    ]
  },
  {
    name: "Central California", count: 2,
    spots: [
      { id: 6, name: "Steamer Lane", city: "Santa Cruz", difficulty: "Advanced", wave: "5–8 ft", wind: "15 mph W" },
      { id: 7, name: "Pleasure Point", city: "Santa Cruz", difficulty: "Intermediate", wave: "4–6 ft", wind: "12 mph W" },
    ]
  },
  {
    name: "Florida", count: 2,
    spots: [
      { id: 8, name: "Cocoa Beach", city: "Cocoa Beach", difficulty: "Beginner", wave: "2–3 ft", wind: "10 mph SE" },
      { id: 9, name: "Sebastian Inlet", city: "Sebastian", difficulty: "Intermediate", wave: "3–4 ft", wind: "8 mph NE" },
    ]
  },
];

const DIFF_DOT: Record<string, string> = {
  Beginner: "#34d399",
  Intermediate: "#fbbf24",
  Advanced: "#fb923c",
  Expert: "#f87171",
};

export default function OceanList() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ "Southern California": true });

  const toggle = (name: string) => setOpen(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto"
      style={{ background: "#030a14" }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 pt-6 pb-5"
        style={{ background: "linear-gradient(160deg,#022c22 0%,#041a2e 100%)" }}>
        {/* Wave lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 390 120" preserveAspectRatio="none">
          {[0,18,36].map(o => (
            <path key={o} d={`M0 ${60+o} Q97 ${50+o} 195 ${60+o} T390 ${60+o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />
          ))}
        </svg>
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">LiveSwell</span>
          </div>
          <h1 className="text-white font-black text-2xl leading-tight mb-3">Surf Spots</h1>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search spots or regions…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] text-slate-300 placeholder-slate-600 outline-none"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>
      </div>

      <div className="pb-8">
        {/* ── Saved ── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={11} className="text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved Spots</span>
          </div>
          {SAVED.map(s => (
            <div key={s.id}
              className="flex items-center justify-between py-2.5 cursor-pointer"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-8 rounded-full bg-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-[13px] font-bold leading-tight">{s.name}</p>
                  <p className="text-slate-600 text-[10px]">{s.city}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-[11px] font-semibold">{s.wave}</p>
                <p className="text-cyan-500 text-[10px]">{s.wind}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Regions ── */}
        <div className="px-4 pt-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Browse by Region</span>
          </div>
          {REGIONS.map(region => (
            <div key={region.name} className="mb-1">
              {/* Region header */}
              <button
                onClick={() => toggle(region.name)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer"
                style={{ background: open[region.name] ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${open[region.name] ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                <div className="flex items-center gap-2">
                  <MapPin size={11} className={open[region.name] ? "text-emerald-400" : "text-slate-500"} />
                  <span className={`text-[12px] font-bold ${open[region.name] ? "text-emerald-400" : "text-slate-400"}`}>{region.name}</span>
                  <span className="text-slate-600 text-[9px]">{region.count} spots</span>
                </div>
                {open[region.name]
                  ? <ChevronDown size={12} className="text-emerald-500" />
                  : <ChevronRight size={12} className="text-slate-600" />
                }
              </button>

              {/* Spot rows */}
              {open[region.name] && (
                <div className="ml-3 mt-1 space-y-px">
                  {region.spots.map(spot => (
                    <div key={spot.id}
                      className="flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg"
                      style={{ borderLeft: `2px solid ${DIFF_DOT[spot.difficulty]}` }}>
                      <div>
                        <p className="text-slate-200 text-[12px] font-semibold leading-tight">{spot.name}</p>
                        <p className="text-slate-600 text-[10px]">{spot.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-[11px] font-bold">{spot.wave}</p>
                        <p className="text-cyan-500 text-[9px]">{spot.wind}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
