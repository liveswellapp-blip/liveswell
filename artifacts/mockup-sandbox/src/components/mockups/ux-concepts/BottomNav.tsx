import { Waves, Map, Heart, User, Search, MapPin, Wind, BarChart3 } from "lucide-react";

const spots = [
  { name: "Mavericks", city: "Half Moon Bay, CA", wave: "4-5 ft", quality: "epic" },
  { name: "Trestles", city: "San Clemente, CA", wave: "4 ft", quality: "epic" },
  { name: "Cocoa Beach", city: "Cocoa Beach, FL", wave: "2-3 ft", quality: "fair" },
  { name: "Pipeline", city: "Oahu, HI", wave: "6-8 ft", quality: "epic" },
  { name: "Folly Beach", city: "Charleston, SC", wave: "5-6 ft", quality: "good" },
];

const qColor: Record<string, string> = {
  epic: "bg-emerald-500", good: "bg-sky-500", fair: "bg-amber-500", poor: "bg-red-500",
};
const qLabel: Record<string, string> = {
  epic: "EPIC", good: "GOOD", fair: "FAIR", poor: "POOR",
};
const qText: Record<string, string> = {
  epic: "text-emerald-400", good: "text-sky-400", fair: "text-amber-400", poor: "text-red-400",
};

export function BottomNav() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Header */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-bold text-xl">LiveSwell</h1>
            <p className="text-slate-400 text-xs">218 surf spots worldwide</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-2.5 border border-white/8">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-500 text-sm">Search spots...</span>
        </div>
      </div>

      {/* Spot list */}
      <div className="flex-1 overflow-hidden px-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">All Spots</p>
          <p className="text-emerald-400 text-xs">Filter</p>
        </div>
        <div className="space-y-2">
          {spots.map((spot) => (
            <div key={spot.name} className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-white/6">
              <div className={`w-1 self-stretch rounded-full ${qColor[spot.quality]} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{spot.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <p className="text-slate-400 text-xs">{spot.city}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${qText[spot.quality]}`}>{spot.wave}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${qColor[spot.quality]} text-white`}>{qLabel[spot.quality]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="mx-4 mb-4 mt-3">
        <div className="bg-slate-900 border border-white/10 rounded-2xl px-2 py-2 flex items-center justify-around shadow-2xl">
          {[
            { icon: Waves, label: "Spots", active: true },
            { icon: Map, label: "Map", active: false },
            { icon: Heart, label: "Saved", active: false },
            { icon: User, label: "Profile", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${active ? "bg-emerald-500/15" : ""}`}>
              <Icon className={`h-5 w-5 ${active ? "text-emerald-400" : "text-slate-500"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
