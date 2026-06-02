import { Waves, Wind, ChevronLeft, Droplets, Sun, BarChart3, Bot } from "lucide-react";

const tabs = ["Now", "Forecast", "Tides", "AI Report"];

export function TabLayout() {
  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-base">Mavericks</p>
          <p className="text-slate-400 text-xs">Half Moon Bay, CA</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 font-black text-sm">7.2</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex mx-3 bg-slate-800/80 rounded-xl p-1 gap-0.5">
        {tabs.map((tab, i) => (
          <button key={tab}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${i === 0 ? "bg-emerald-500 text-white" : "text-slate-400"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* "Now" tab content */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-3">

        {/* Primary stat row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-white/8">
            <div className="flex items-center gap-1.5 mb-1">
              <Waves className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400 text-xs">Waves</span>
            </div>
            <p className="text-emerald-400 font-black text-2xl">4–5<span className="text-sm font-semibold text-slate-400 ml-1">ft</span></p>
            <p className="text-slate-400 text-xs mt-0.5">WSW @ 17s</p>
          </div>
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-white/8">
            <div className="flex items-center gap-1.5 mb-1">
              <Wind className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-400 text-xs">Wind</span>
            </div>
            <p className="text-sky-400 font-black text-2xl">5<span className="text-sm font-semibold text-slate-400 ml-1">mph</span></p>
            <p className="text-slate-400 text-xs mt-0.5">N — Offshore ✓</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/8 text-center">
            <Droplets className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">58°F</p>
            <p className="text-slate-500 text-[10px]">Water</p>
          </div>
          <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/8 text-center">
            <Sun className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">UV 6</p>
            <p className="text-slate-500 text-[10px]">High</p>
          </div>
          <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/8 text-center">
            <BarChart3 className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">+1.2ft</p>
            <p className="text-slate-500 text-[10px]">Rising</p>
          </div>
        </div>

        {/* AI snippet */}
        <div className="bg-emerald-900/30 rounded-2xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">AI Summary</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">Solid overhead sets rolling in from the NW. Light offshore winds keeping faces clean. Best window before 11am before sea breeze kicks in.</p>
          <button className="text-emerald-400 text-xs font-semibold mt-2">Read full report →</button>
        </div>

        {/* Next tide */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-white/8">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Today's Tides</p>
          <div className="flex justify-between">
            {[{ time: "2:20 AM", type: "Low", ht: "1.2ft" }, { time: "8:45 AM", type: "High", ht: "5.8ft" }, { time: "3:10 PM", type: "Low", ht: "0.8ft" }, { time: "9:30 PM", type: "High", ht: "4.9ft" }].map(t => (
              <div key={t.time} className="text-center">
                <p className="text-slate-400 text-[10px]">{t.time}</p>
                <p className={`font-bold text-xs ${t.type === "High" ? "text-cyan-400" : "text-slate-300"}`}>{t.type}</p>
                <p className="text-slate-500 text-[10px]">{t.ht}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
