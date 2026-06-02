import { useState } from "react";
import { MapPin, Waves, Wind, Search, Heart, SlidersHorizontal, TrendingUp, TrendingDown } from "lucide-react";

interface Spot {
  id: number;
  name: string;
  city: string;
  wave: string;
  wind: string;
  tide: { type: "High" | "Low"; time: string };
}

const SAVED: Spot[] = [
  { id: 1, name: "Mavericks",  city: "Half Moon Bay", wave: "8–12 ft", wind: "12 mph NW", tide: { type: "Low",  time: "2:14 PM" } },
  { id: 2, name: "Pipeline",   city: "Haleiwa, HI",   wave: "6–10 ft", wind: "8 mph E",   tide: { type: "High", time: "3:47 PM" } },
  { id: 3, name: "Trestles",   city: "San Clemente",  wave: "3–5 ft",  wind: "7 mph NW",  tide: { type: "High", time: "5:02 PM" } },
];

const SPOTS: Spot[] = [
  { id: 4,  name: "Steamer Lane",    city: "Santa Cruz, CA",       wave: "5–8 ft",   wind: "15 mph W",  tide: { type: "Low",  time: "1:38 PM" } },
  { id: 5,  name: "Rincon",          city: "Carpinteria, CA",      wave: "4–6 ft",   wind: "5 mph N",   tide: { type: "High", time: "6:20 PM" } },
  { id: 6,  name: "Huntington",      city: "Huntington Beach, CA", wave: "3–4 ft",   wind: "6 mph SW",  tide: { type: "Low",  time: "4:55 PM" } },
  { id: 7,  name: "Cocoa Beach",     city: "Cocoa Beach, FL",      wave: "2–3 ft",   wind: "10 mph SE", tide: { type: "High", time: "7:10 PM" } },
  { id: 8,  name: "Sebastian Inlet", city: "Sebastian, FL",        wave: "3–4 ft",   wind: "8 mph NE",  tide: { type: "Low",  time: "3:30 PM" } },
  { id: 9,  name: "Tofino",          city: "British Columbia",     wave: "6–9 ft",   wind: "18 mph W",  tide: { type: "High", time: "4:15 PM" } },
  { id: 10, name: "Uluwatu",         city: "Bali, Indonesia",      wave: "6–10 ft",  wind: "10 mph SE", tide: { type: "Low",  time: "2:50 PM" } },
  { id: 11, name: "Nazaré",          city: "Leiria, Portugal",     wave: "12–20 ft", wind: "20 mph N",  tide: { type: "High", time: "5:33 PM" } },
];

function SpotCard({ spot }: { spot: Spot }) {
  const TideIcon = spot.tide.type === "High" ? TrendingUp : TrendingDown;
  const tideColor = spot.tide.type === "High" ? "text-sky-400" : "text-teal-400";

  return (
    <div className="rounded-2xl p-3 cursor-pointer flex flex-col gap-2"
      style={{ background: "linear-gradient(160deg,#030f1c,#041a2e)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div>
        <p className="text-white text-[12px] font-bold leading-tight">{spot.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={8} className="text-slate-600 flex-shrink-0" />
          <p className="text-slate-600 text-[9px] leading-tight truncate">{spot.city}</p>
        </div>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Waves size={9} className="text-emerald-500 flex-shrink-0" />
          <span className="text-emerald-400 text-[11px] font-bold">{spot.wave}</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind size={9} className="text-cyan-600 flex-shrink-0" />
          <span className="text-cyan-500 text-[10px]">{spot.wind}</span>
        </div>
        <div className="flex items-center gap-1">
          <TideIcon size={9} className={`${tideColor} flex-shrink-0`} />
          <span className={`${tideColor} text-[10px]`}>{spot.tide.type} {spot.tide.time}</span>
        </div>
      </div>
    </div>
  );
}

export default function GridTiles() {
  const [search, setSearch] = useState("");

  const filtered = SPOTS.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
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
        {/* ── Saved grid ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Heart size={11} className="text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SAVED.map(s => <SpotCard key={s.id} spot={s} />)}
          </div>
        </div>

        {/* ── All Locations grid ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">All Locations</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(spot => <SpotCard key={spot.id} spot={spot} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
