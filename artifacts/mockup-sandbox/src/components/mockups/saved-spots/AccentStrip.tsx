import { Waves, Wind, BarChart3, Heart } from "lucide-react";

const spots = [
  { name: "Mavericks", city: "Half Moon Bay, USA", wave: "4-5 ft WSW @ 17s", wind: "5 mph N", tide: "High 2:20 PM", quality: "epic" },
  { name: "Trestles", city: "San Clemente, USA", wave: "4 ft SSW @ 17s", wind: "2 mph SE", tide: "High 2:20 PM", quality: "epic" },
  { name: "Cocoa Beach", city: "Cocoa Beach, USA", wave: "2-3 ft ENE @ 12s", wind: "7 mph NE", tide: "High 5:20 PM", quality: "fair" },
  { name: "Jacksonville Beach", city: "Jacksonville, USA", wave: "2-3 ft NE @ 12s", wind: "5 mph NNE", tide: "High 5:20 PM", quality: "fair" },
  { name: "Folly Beach", city: "Charleston, USA", wave: "5-6 ft E @ 5s", wind: "2 mph N", tide: "High 5:20 PM", quality: "good" },
];

const accentColor: Record<string, string> = {
  epic: "bg-emerald-400",
  good: "bg-sky-400",
  fair: "bg-amber-400",
  poor: "bg-red-400",
};

const dotColor: Record<string, string> = {
  epic: "bg-emerald-400",
  good: "bg-sky-400",
  fair: "bg-amber-400",
  poor: "bg-red-400",
};

export function AccentStrip() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 fill-emerald-400 text-emerald-400" />
          <h2 className="text-white font-bold text-lg">Saved Spots</h2>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
          {spots.map((spot, i) => (
            <div
              key={spot.name}
              className={`flex items-stretch gap-0 ${i < spots.length - 1 ? "border-b border-white/8" : ""}`}
            >
              {/* Left quality accent bar */}
              <div className={`w-1 flex-shrink-0 ${accentColor[spot.quality]}`} />

              {/* Content */}
              <div className="flex items-center justify-between px-3 py-3 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor[spot.quality]}`} />
                    <p className="text-white font-semibold text-sm leading-tight truncate">{spot.name}</p>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 ml-3.5">{spot.city}</p>
                </div>

                <div className="flex flex-col gap-0.5 text-xs items-end ml-2 flex-shrink-0">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Waves className="h-3 w-3" />{spot.wave}
                  </span>
                  <span className="flex items-center gap-1 text-sky-400 font-medium">
                    <Wind className="h-3 w-3" />{spot.wind}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <BarChart3 className="h-3 w-3" />{spot.tide}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs text-center mt-3">Color bar = swell quality</p>
      </div>
    </div>
  );
}
