import { Clock, Waves, Wind, BarChart3, Star, ChevronLeft } from "lucide-react";

const hours = [
  { h: "5", score: 5 }, { h: "6", score: 7 }, { h: "7", score: 9 },
  { h: "8", score: 9 }, { h: "9", score: 8 }, { h: "10", score: 7 },
  { h: "11", score: 6 }, { h: "12", score: 5 }, { h: "1p", score: 4 },
  { h: "2p", score: 4 }, { h: "3p", score: 3 }, { h: "4p", score: 4 },
  { h: "5p", score: 5 }, { h: "6p", score: 6 }, { h: "7p", score: 5 },
];

const barColor = (s: number) => {
  if (s >= 8) return "#10b981";
  if (s >= 6) return "#38bdf8";
  if (s >= 4) return "#f59e0b";
  return "#6b7280";
};

export function BestWindow() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-base">Mavericks</p>
          <p className="text-slate-400 text-xs">Tuesday, June 3</p>
        </div>
      </div>

      {/* Best window hero card */}
      <div className="mx-3 rounded-2xl overflow-hidden border border-emerald-500/30"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)" }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-emerald-400 fill-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Best Window Today</span>
          </div>
          <p className="text-white font-black text-4xl mt-1">7 – 10 AM</p>
          <p className="text-emerald-300 text-sm mt-1 font-medium">Offshore winds · Rising tide · Overhead sets</p>
        </div>

        {/* Conditions at peak */}
        <div className="grid grid-cols-3 divide-x divide-emerald-500/20 border-t border-emerald-500/20">
          {[
            { icon: Waves, label: "Waves", value: "4–5 ft", sub: "@ 17s" },
            { icon: Wind, label: "Wind", value: "5 mph", sub: "Offshore" },
            { icon: BarChart3, label: "Tide", value: "Rising", sub: "+1.2 ft" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="px-4 py-3 text-center">
              <Icon className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{value}</p>
              <p className="text-emerald-500 text-[10px]">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly score chart */}
      <div className="mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Surf Score by Hour</p>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-1 h-20">
          {hours.map(({ h, score }) => (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-sm transition-all"
                style={{ height: `${score * 8}px`, backgroundColor: barColor(score), opacity: score >= 8 ? 1 : 0.5 }} />
            </div>
          ))}
        </div>

        {/* Time labels */}
        <div className="flex items-center gap-1 mt-1">
          {hours.filter((_, i) => i % 3 === 0).map(({ h }) => (
            <div key={h} className="flex-1 text-center">
              <span className="text-slate-500 text-[9px]">{h}</span>
            </div>
          ))}
          <div className="flex-1" /><div className="flex-1" />
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {[["#10b981", "Epic (8-10)"], ["#38bdf8", "Good (6-7)"], ["#f59e0b", "Fair (4-5)"]].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-slate-400 text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Other windows */}
      <div className="mx-3 mt-3">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Other Windows</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/8 text-center">
            <p className="text-slate-300 text-xs font-bold">5 – 6 PM</p>
            <p className="text-sky-400 text-[10px] mt-0.5">Good · 6.2</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/8 text-center">
            <p className="text-slate-300 text-xs font-bold">Sunrise</p>
            <p className="text-amber-400 text-[10px] mt-0.5">Fair · 4.8</p>
          </div>
        </div>
      </div>
    </div>
  );
}
