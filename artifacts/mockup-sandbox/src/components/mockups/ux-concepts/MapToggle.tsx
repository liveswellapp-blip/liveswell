import { List, Map, Search, MapPin, Waves, Heart, User } from "lucide-react";

const pins = [
  { name: "Mavericks", x: 18, y: 38, quality: "epic" },
  { name: "Trestles", x: 22, y: 50, quality: "epic" },
  { name: "Pipeline", x: 12, y: 58, quality: "epic" },
  { name: "Cocoa Beach", x: 72, y: 44, quality: "fair" },
  { name: "Tofino", x: 16, y: 26, quality: "good" },
  { name: "Nazaré", x: 44, y: 36, quality: "good" },
  { name: "J-Bay", x: 60, y: 72, quality: "good" },
  { name: "Bali", x: 76, y: 60, quality: "epic" },
  { name: "Gold Coast", x: 84, y: 68, quality: "good" },
  { name: "Folly Beach", x: 68, y: 46, quality: "good" },
];

const pinColor: Record<string, string> = {
  epic: "#10b981", good: "#38bdf8", fair: "#f59e0b", poor: "#ef4444",
};

export function MapToggle() {
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
          <h1 className="text-white font-bold text-xl">LiveSwell</h1>
          <Search className="h-5 w-5 text-slate-400" />
        </div>

        {/* List / Map toggle */}
        <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium">
            <List className="h-3.5 w-3.5" />List
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold">
            <Map className="h-3.5 w-3.5" />Map
          </button>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 mx-4 mb-3 rounded-2xl overflow-hidden relative border border-white/10" style={{ background: "linear-gradient(160deg, #0c2340 0%, #0a3d2e 40%, #071a2e 100%)" }}>
        {/* Ocean texture lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 390 550">
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d={`M0 ${50 + i * 45} Q100 ${40 + i * 45} 200 ${55 + i * 45} T400 ${50 + i * 45}`} stroke="#38bdf8" strokeWidth="1" fill="none" />
          ))}
        </svg>

        {/* Continent shapes (simplified) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* N America */}
          <path d="M8 20 L30 18 L32 35 L22 50 L12 48 L8 35Z" fill="#1e3a4a" opacity="0.7" />
          {/* S America */}
          <path d="M18 52 L30 50 L32 72 L22 76 L16 68Z" fill="#1e3a4a" opacity="0.7" />
          {/* Europe/Africa */}
          <path d="M42 20 L52 18 L54 40 L48 50 L40 42 L38 28Z" fill="#1e3a4a" opacity="0.7" />
          <path d="M44 52 L54 50 L56 76 L46 78 L40 68Z" fill="#1e3a4a" opacity="0.7" />
          {/* Asia/Australia */}
          <path d="M58 14 L90 12 L92 42 L78 48 L60 44 L54 28Z" fill="#1e3a4a" opacity="0.7" />
          <path d="M76 60 L88 58 L90 72 L80 74 L72 68Z" fill="#1e3a4a" opacity="0.7" />
        </svg>

        {/* Spot pins */}
        {pins.map((pin) => (
          <div key={pin.name} className="absolute" style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}>
            <div className="relative group">
              <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg shadow-black/50"
                style={{ backgroundColor: pinColor[pin.quality] }} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900/95 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap border border-white/20 pointer-events-none">
                {pin.name}
              </div>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 rounded-xl px-3 py-2 border border-white/10 backdrop-blur-sm">
          <p className="text-slate-400 text-[9px] uppercase tracking-wide font-semibold mb-1.5">Conditions</p>
          {[["#10b981", "Epic"], ["#38bdf8", "Good"], ["#f59e0b", "Fair"]].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white text-[10px]">{label}</span>
            </div>
          ))}
        </div>

        {/* Nearby button */}
        <div className="absolute top-3 right-3">
          <button className="bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg">
            <MapPin className="h-3 w-3" />Near Me
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="mx-4 mb-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl px-2 py-2 flex items-center justify-around shadow-2xl">
          {[
            { icon: Waves, label: "Spots", active: false },
            { icon: Map, label: "Map", active: true },
            { icon: Heart, label: "Saved", active: false },
            { icon: User, label: "Profile", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl ${active ? "bg-emerald-500/15" : ""}`}>
              <Icon className={`h-5 w-5 ${active ? "text-emerald-400" : "text-slate-500"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
