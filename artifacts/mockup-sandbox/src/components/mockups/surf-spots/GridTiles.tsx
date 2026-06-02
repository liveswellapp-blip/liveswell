import { useState } from "react";
import { MapPin, Waves, Wind, Search, Heart, SlidersHorizontal } from "lucide-react";

const SAVED = [
  { id: 1, name: "Mavericks", city: "Half Moon Bay", wave: "8–12 ft" },
  { id: 2, name: "Pipeline", city: "Haleiwa, HI", wave: "6–10 ft" },
  { id: 3, name: "Trestles", city: "San Clemente", wave: "3–5 ft" },
];

const SPOTS = [
  { id: 4, name: "Steamer Lane", city: "Santa Cruz, CA", difficulty: "Advanced", type: "Reef", wave: "5–8 ft", wind: "15 mph W" },
  { id: 5, name: "Rincon", city: "Carpinteria, CA", difficulty: "Beginner", type: "Point", wave: "4–6 ft", wind: "5 mph N" },
  { id: 6, name: "Huntington", city: "Huntington Beach, CA", difficulty: "Beginner", type: "Beach", wave: "3–4 ft", wind: "6 mph SW" },
  { id: 7, name: "Cocoa Beach", city: "Cocoa Beach, FL", difficulty: "Beginner", type: "Beach", wave: "2–3 ft", wind: "10 mph SE" },
  { id: 8, name: "Sebastian Inlet", city: "Sebastian, FL", difficulty: "Intermediate", type: "Jetty", wave: "3–4 ft", wind: "8 mph NE" },
  { id: 9, name: "Tofino", city: "British Columbia", difficulty: "Advanced", type: "Beach", wave: "6–9 ft", wind: "18 mph W" },
  { id: 10, name: "Uluwatu", city: "Bali, Indonesia", difficulty: "Expert", type: "Reef", wave: "6–10 ft", wind: "10 mph SE" },
  { id: 11, name: "Nazaré", city: "Leiria, Portugal", difficulty: "Expert", type: "Beach", wave: "12–20 ft", wind: "20 mph N" },
];

const DIFF_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  Beginner:     { text: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/25" },
  Intermediate: { text: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/25" },
  Advanced:     { text: "text-orange-400",  bg: "bg-orange-500/10",   border: "border-orange-500/25" },
  Expert:       { text: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/25" },
};

const FILTERS = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

export default function GridTiles() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = SPOTS.filter(s =>
    (filter === "All" || s.difficulty === filter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto"
      style={{ background: "#030a14" }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 pt-6 pb-5"
        style={{ background: "linear-gradient(160deg,#022c22 0%,#041a2e 100%)" }}>
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] text-slate-300 placeholder-slate-600 outline-none"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <SlidersHorizontal size={13} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* ── Saved horizontal scroll ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Heart size={11} className="text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {SAVED.map(s => (
              <div key={s.id}
                className="flex-shrink-0 rounded-xl px-3 py-2.5 cursor-pointer"
                style={{ minWidth: 110, background: "linear-gradient(120deg,#04202e,#041a2e)", border: "1px solid rgba(16,185,129,0.22)" }}>
                <p className="text-white text-[11px] font-bold leading-tight truncate">{s.name}</p>
                <p className="text-slate-600 text-[9px] truncate">{s.city}</p>
                <p className="text-emerald-400 text-[11px] font-semibold mt-1">{s.wave}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Difficulty filter pills ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
              style={{
                background: filter === f ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
                border: filter === f ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: filter === f ? "#34d399" : "#64748b",
              }}>
              {f}
            </button>
          ))}
        </div>

        {/* ── 2-col grid ── */}
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(spot => {
            const d = DIFF_STYLE[spot.difficulty];
            return (
              <div key={spot.id}
                className="rounded-2xl p-3 cursor-pointer flex flex-col gap-2"
                style={{ background: "linear-gradient(160deg,#030f1c,#041a2e)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Name + location */}
                <div>
                  <p className="text-white text-[12px] font-bold leading-tight">{spot.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={8} className="text-slate-600 flex-shrink-0" />
                    <p className="text-slate-600 text-[9px] leading-tight truncate">{spot.city}</p>
                  </div>
                </div>
                {/* Wave + wind */}
                <div>
                  <div className="flex items-center gap-1">
                    <Waves size={9} className="text-emerald-500" />
                    <span className="text-emerald-400 text-[11px] font-bold">{spot.wave}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Wind size={9} className="text-cyan-600" />
                    <span className="text-cyan-500 text-[9px]">{spot.wind}</span>
                  </div>
                </div>
                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${d.text} ${d.bg} ${d.border}`}>{spot.difficulty}</span>
                  <span className="text-slate-600 text-[8px] px-1.5 py-0.5 rounded border border-white/8">{spot.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
