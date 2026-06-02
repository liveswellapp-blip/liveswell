import { Heart } from "lucide-react";

const spots = [
  { name: "Mavericks", city: "Half Moon Bay, USA", waveMin: 4, waveMax: 5, dir: "WSW", period: 17, wind: "5 N", tide: "High", tideTime: "2:20 PM", status: "rising" },
  { name: "Trestles", city: "San Clemente, USA", waveMin: 4, waveMax: 4, dir: "SSW", period: 17, wind: "2 SE", tide: "High", tideTime: "2:20 PM", status: "rising" },
  { name: "Cocoa Beach", city: "Cocoa Beach, USA", waveMin: 2, waveMax: 3, dir: "ENE", period: 12, wind: "7 NE", tide: "High", tideTime: "5:20 PM", status: "rising" },
  { name: "Jacksonville Beach", city: "Jacksonville, USA", waveMin: 2, waveMax: 3, dir: "NE", period: 12, wind: "5 NNE", tide: "High", tideTime: "5:20 PM", status: "rising" },
  { name: "Folly Beach", city: "Charleston, USA", waveMin: 5, waveMax: 6, dir: "E", period: 5, wind: "2 N", tide: "High", tideTime: "5:20 PM", status: "rising" },
];

export function OceanDark() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] p-4 font-sans">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 fill-emerald-400 text-emerald-400" />
          <h2 className="text-white font-bold text-lg">Saved Spots</h2>
        </div>

        <div className="flex flex-col gap-2">
          {spots.map((spot) => {
            const waveLabel = spot.waveMin === spot.waveMax
              ? `${spot.waveMin}`
              : `${spot.waveMin}-${spot.waveMax}`;

            return (
              <div
                key={spot.name}
                className="rounded-xl overflow-hidden flex"
                style={{ background: "linear-gradient(135deg, #0d2137 0%, #0f1e2e 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Wave height block — left accent */}
                <div
                  className="flex flex-col items-center justify-center px-3 py-3 min-w-[60px]"
                  style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.05) 100%)", borderRight: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <span className="text-emerald-300 font-black text-xl leading-none">{waveLabel}</span>
                  <span className="text-emerald-500 text-[10px] font-medium mt-0.5">ft</span>
                  <span className="text-slate-400 text-[9px] mt-1 font-medium">{spot.dir}</span>
                </div>

                {/* Main content */}
                <div className="flex-1 px-3 py-2.5">
                  <p className="text-white font-bold text-sm leading-tight">{spot.name}</p>
                  <p className="text-slate-500 text-xs">{spot.city}</p>

                  <div className="flex gap-3 mt-2">
                    <div className="text-center">
                      <p className="text-slate-400 text-[9px] uppercase tracking-wide font-semibold">Period</p>
                      <p className="text-sky-300 text-xs font-bold">{spot.period}s</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-[9px] uppercase tracking-wide font-semibold">Wind</p>
                      <p className="text-sky-300 text-xs font-bold">{spot.wind} mph</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-[9px] uppercase tracking-wide font-semibold">Next Tide</p>
                      <p className="text-amber-300 text-xs font-bold">{spot.tide} {spot.tideTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
