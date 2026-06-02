import { Waves, Wind, TrendingUp, Heart } from "lucide-react";

const spots = [
  { name: "Mavericks", city: "Half Moon Bay, USA", wave: "4-5 ft WSW", period: "17s", wind: "5 mph N", tide: "High 2:20 PM" },
  { name: "Trestles", city: "San Clemente, USA", wave: "4 ft SSW", period: "17s", wind: "2 mph SE", tide: "High 2:20 PM" },
  { name: "Cocoa Beach", city: "Cocoa Beach, USA", wave: "2-3 ft ENE", period: "12s", wind: "7 mph NE", tide: "High 5:20 PM" },
  { name: "Jacksonville Beach", city: "Jacksonville, USA", wave: "2-3 ft NE", period: "12s", wind: "5 mph NNE", tide: "High 5:20 PM" },
  { name: "Folly Beach", city: "Charleston, USA", wave: "5-6 ft E", period: "5s", wind: "2 mph N", tide: "High 5:20 PM" },
];

export function DataChips() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 fill-emerald-400 text-emerald-400" />
          <h2 className="text-white font-bold text-lg">Saved Spots</h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {spots.map((spot) => (
            <div
              key={spot.name}
              className="rounded-xl bg-slate-800/80 border border-white/8 px-4 py-3"
            >
              {/* Header row */}
              <div className="flex items-baseline justify-between mb-2.5">
                <div>
                  <p className="text-white font-bold text-sm">{spot.name}</p>
                  <p className="text-slate-500 text-xs">{spot.city}</p>
                </div>
              </div>

              {/* Chip row */}
              <div className="flex gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <Waves className="h-2.5 w-2.5" />
                  {spot.wave}
                  <span className="text-emerald-500 font-bold">@ {spot.period}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium">
                  <Wind className="h-2.5 w-2.5" />
                  {spot.wind}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {spot.tide}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
