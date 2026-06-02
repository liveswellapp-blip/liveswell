import { useState } from "react";
import { MapPin, Waves, Wind, Search, Heart, ChevronRight, Zap } from "lucide-react";

const SAVED = [
  { id: 1, name: "Mavericks", city: "Half Moon Bay, CA", wave: "8–12 ft", wind: "12 mph NW" },
  { id: 2, name: "Pipeline", city: "Haleiwa, HI", wave: "6–10 ft", wind: "8 mph E" },
];

const SPOTS = [
  { id: 3, name: "Trestles", city: "San Clemente", region: "Southern California", difficulty: "Intermediate", type: "Point Break", wave: "3–5 ft", wind: "7 mph NW" },
  { id: 4, name: "Rincon", city: "Carpinteria", region: "Southern California", difficulty: "Beginner", type: "Point Break", wave: "4–6 ft", wind: "5 mph N" },
  { id: 5, name: "Steamer Lane", city: "Santa Cruz", region: "Central California", difficulty: "Advanced", type: "Reef Break", wave: "5–8 ft", wind: "15 mph W" },
  { id: 6, name: "Cocoa Beach", city: "Cocoa Beach", region: "Florida", difficulty: "Beginner", type: "Beach Break", wave: "2–3 ft", wind: "10 mph SE" },
  { id: 7, name: "Sebastian Inlet", city: "Sebastian", region: "Florida", difficulty: "Intermediate", type: "Jetty Break", wave: "3–4 ft", wind: "8 mph NE" },
  { id: 8, name: "Huntington Beach", city: "Huntington Beach", region: "Southern California", difficulty: "Beginner", type: "Beach Break", wave: "3–4 ft", wind: "6 mph SW" },
];

const DIFF_COLOR: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  Advanced: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  Expert: "text-red-400 bg-red-500/10 border-red-500/25",
};

export default function DarkCards() {
  const [search, setSearch] = useState("");
  const filtered = SPOTS.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto"
      style={{ background: "#030a14" }}>

      {/* ── Hero header ── */}
      <div className="px-4 pt-6 pb-4"
        style={{ background: "linear-gradient(160deg,#022c22 0%,#041a2e 100%)" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">LiveSwell</span>
        </div>
        <h1 className="text-white font-black text-2xl leading-tight mb-4">Global Surf Spots</h1>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search spots, cities…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-[12px] text-slate-300 placeholder-slate-600 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5 pb-8">
        {/* ── Saved spots ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 5px #34d399" }} />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved Spots</span>
          </div>
          <div className="space-y-2">
            {SAVED.map(s => (
              <div key={s.id}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer"
                style={{ background: "linear-gradient(120deg,#04202e,#041a2e)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">{s.name}</p>
                  <p className="text-slate-500 text-[10px]">{s.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 text-[11px] font-semibold">{s.wave}</p>
                  <p className="text-cyan-500 text-[10px]">{s.wind}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── All spots ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">All Spots</span>
            <span className="text-slate-600 text-[9px]">{filtered.length} results</span>
          </div>
          <div className="space-y-2">
            {filtered.map(spot => (
              <div key={spot.id}
                className="rounded-xl px-3 py-3 cursor-pointer"
                style={{ background: "linear-gradient(160deg,#030f1c,#041a2e)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-white text-sm font-bold leading-tight">{spot.name}</p>
                      <ChevronRight size={11} className="text-slate-600 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin size={9} className="text-slate-600" />
                      <p className="text-slate-500 text-[10px]">{spot.city} · {spot.region}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${DIFF_COLOR[spot.difficulty]}`}>{spot.difficulty}</span>
                      <span className="text-slate-600 text-[9px] px-1.5 py-0.5 rounded border border-white/8">{spot.type}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <Waves size={9} className="text-emerald-500" />
                      <span className="text-emerald-400 text-[11px] font-bold">{spot.wave}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Wind size={9} className="text-cyan-600" />
                      <span className="text-cyan-500 text-[10px]">{spot.wind}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
