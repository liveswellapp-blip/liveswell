import { Waves, MapPin, Navigation } from "lucide-react";

const SPOTS = [
  { name: "Canaveral Pier", distance: "1.2 mi", direction: "N", bearing: 0,   waveHeight: "2–3", period: 8  },
  { name: "Jetty Park",     distance: "3.4 mi", direction: "N", bearing: 15,  waveHeight: "2–3", period: 8  },
  { name: "Sebastian Inlet",distance: "18 mi",  direction: "S", bearing: 175, waveHeight: "3–4", period: 10 },
  { name: "New Smyrna",     distance: "27 mi",  direction: "N", bearing: 355, waveHeight: "2–3", period: 9  },
  { name: "Playalinda",     distance: "8.1 mi", direction: "N", bearing: 10,  waveHeight: "2–3", period: 8  },
  { name: "Satellite Beach",distance: "5.7 mi", direction: "S", bearing: 185, waveHeight: "2–3", period: 8  },
];

function CompassArrow({ bearing }: { bearing: number }) {
  const rad = (bearing - 90) * (Math.PI / 180);
  const cx = 10, cy = 10, r = 6;
  const tx = cx + r * Math.cos(rad);
  const ty = cy + r * Math.sin(rad);
  const bx = cx - r * 0.6 * Math.cos(rad);
  const by = cy - r * 0.6 * Math.sin(rad);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx={cx} cy={cy} r={r + 2} fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)" strokeWidth="0.5" />
      <line x1={bx} y1={by} x2={tx} y2={ty} stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={tx} cy={ty} r="1.5" fill="#10b981" />
    </svg>
  );
}

export default function NearbySpots() {
  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-6 pt-8">
      <div style={{ width: 680 }}>

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">Nearby Surf Spots</span>
          </div>
          <span className="text-slate-600 text-[10px]">within 30 miles</span>
        </div>

        {/* ── Spots grid ── */}
        <div className="grid grid-cols-3 gap-3">
          {SPOTS.map((spot, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 cursor-pointer transition-all"
              style={{
                background: "linear-gradient(160deg, #030f1c 0%, #041a2e 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Top row: icon + distance */}
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <Waves size={14} className="text-emerald-400" />
                </div>
                <div className="flex items-center gap-1">
                  <CompassArrow bearing={spot.bearing} />
                  <span className="text-slate-500 text-[9px]">{spot.distance}</span>
                </div>
              </div>

              {/* Spot name */}
              <p className="text-white text-[11px] font-semibold leading-tight mb-2">{spot.name}</p>

              {/* Wave data chips */}
              <div className="flex gap-1.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <span className="text-emerald-400 text-[9px] font-bold">{spot.waveHeight} ft</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.15)" }}>
                  <span className="text-teal-400 text-[9px] font-semibold">{spot.period}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin size={10} className="text-slate-600" />
            <span className="text-slate-700 text-[9px]">Cocoa Beach, FL</span>
          </div>
          <span className="text-slate-700 text-[9px]">Conditions from NOAA buoys</span>
        </div>

      </div>
    </div>
  );
}
