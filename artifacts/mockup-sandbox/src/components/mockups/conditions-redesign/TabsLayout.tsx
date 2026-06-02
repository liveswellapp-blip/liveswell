import { Waves, Wind, BarChart3, Droplets, Sun, Bot, MapPin, ChevronLeft, Heart, Star } from "lucide-react";
import { useState } from "react";

const TABS = ["Now", "Forecast", "Tides", "AI Report"] as const;
type Tab = typeof TABS[number];

const forecast = [
  { day: "Mon", wave: "4–5ft", period: "17s", wind: "5 mph N", score: 7, color: "text-emerald-400", badge: "bg-emerald-500" },
  { day: "Tue", wave: "3–4ft", period: "14s", wind: "8 mph NW", score: 6, color: "text-sky-400", badge: "bg-sky-500" },
  { day: "Wed", wave: "5–6ft", period: "18s", wind: "4 mph N",  score: 9, color: "text-emerald-400", badge: "bg-emerald-500" },
  { day: "Thu", wave: "2–3ft", period: "12s", wind: "12 mph SW", score: 4, color: "text-amber-400", badge: "bg-amber-500" },
  { day: "Fri", wave: "3ft",   period: "11s", wind: "9 mph S",  score: 5, color: "text-amber-400", badge: "bg-amber-500" },
];

const tidePoints = [
  { time: "12 AM", h: 1.2, type: "Low" }, { time: "6 AM", h: 4.1 }, { time: "8:45 AM", h: 5.8, type: "High" },
  { time: "12 PM", h: 3.1 }, { time: "3:10 PM", h: 0.8, type: "Low" }, { time: "6 PM", h: 3.2 },
  { time: "9:30 PM", h: 4.9, type: "High" }, { time: "12 AM", h: 2.1 },
];

function TideCurve() {
  const pts = tidePoints.map((p, i) => {
    const x = (i / (tidePoints.length - 1)) * 320;
    const y = 60 - (p.h / 6) * 50;
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  return (
    <svg width="320" height="70" viewBox="0 0 320 70">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 320,70 L 0,70 Z`} fill="url(#tg)" />
      <path d={path} stroke="#06b6d4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {tidePoints.filter(p => p.type).map((p, i) => {
        const idx = tidePoints.indexOf(p);
        const x = (idx / (tidePoints.length - 1)) * 320;
        const y = 60 - (p.h / 6) * 50;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill={p.type === "High" ? "#06b6d4" : "#94a3b8"} />
            <text x={x} y={y - 7} textAnchor="middle" fill="#94a3b8" fontSize="8">{p.type} {p.h}ft</text>
          </g>
        );
      })}
    </svg>
  );
}

export function TabsLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("Now");

  return (
    <div className="w-[390px] h-[760px] bg-[#0a0f1a] flex flex-col font-sans overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-slate-400">
        <span className="font-semibold">9:41</span>
        <span>●●● WiFi 🔋</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-base">Mavericks</p>
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className="h-3 w-3 text-slate-400" />
            <p className="text-slate-400 text-xs">Half Moon Bay, CA</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
            <Heart className="h-3.5 w-3.5 text-emerald-400" />
          </button>
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 font-black text-xs">7.2</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800/80 rounded-xl p-1 gap-0.5 mb-2">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2">
        {activeTab === "Now" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8">
                <div className="flex items-center gap-1.5 mb-2"><Waves className="h-3.5 w-3.5 text-emerald-400" /><span className="text-slate-400 text-xs">Waves</span></div>
                <p className="text-emerald-400 font-black text-2xl leading-none">4–5 <span className="text-sm text-slate-400 font-semibold">ft</span></p>
                <p className="text-slate-400 text-xs mt-1">WSW @ 17s</p>
              </div>
              <div className="bg-slate-800/70 rounded-2xl p-4 border border-white/8">
                <div className="flex items-center gap-1.5 mb-2"><Wind className="h-3.5 w-3.5 text-sky-400" /><span className="text-slate-400 text-xs">Wind</span></div>
                <p className="text-sky-400 font-black text-2xl leading-none">5 <span className="text-sm text-slate-400 font-semibold">mph</span></p>
                <p className="text-emerald-400 text-xs mt-1 font-semibold">↑ Offshore</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Droplets, label: "Water", value: "58°F", color: "text-cyan-400" },
                { icon: Sun, label: "UV", value: "6 High", color: "text-amber-400" },
                { icon: BarChart3, label: "Tide", value: "+1.2ft ↑", color: "text-cyan-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-slate-800/70 rounded-xl p-3 border border-white/8 text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                  <p className={`font-bold text-xs ${color}`}>{value}</p>
                  <p className="text-slate-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-800/70 rounded-xl border border-white/8 p-3">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-2">🌅 Today's Sun</p>
              <div className="flex justify-between text-center">
                <div><p className="text-amber-400 font-bold text-sm">6:18 AM</p><p className="text-slate-500 text-[10px]">Sunrise</p></div>
                <div className="flex-1 mx-3 flex items-center"><div className="w-full h-0.5 bg-gradient-to-r from-amber-400/50 via-yellow-300/80 to-amber-400/50 rounded-full" /></div>
                <div><p className="text-orange-400 font-bold text-sm">8:24 PM</p><p className="text-slate-500 text-[10px]">Sunset</p></div>
              </div>
            </div>
            <div className="bg-emerald-900/25 rounded-xl border border-emerald-500/20 p-3 flex gap-2">
              <Bot className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 text-xs leading-relaxed">Solid overhead sets from the NW. Light offshore winds. Best window before 11am.</p>
            </div>
          </>
        )}

        {activeTab === "Forecast" && (
          <div className="space-y-2">
            {forecast.map(({ day, wave, period, wind, score, color, badge }) => (
              <div key={day} className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-white/8">
                <div className={`w-9 h-9 rounded-xl ${badge} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-black text-sm">{score}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">{day}</p>
                    <p className={`font-bold text-sm ${color}`}>{wave}</p>
                  </div>
                  <p className="text-slate-500 text-xs">{wind} · {period}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Tides" && (
          <>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-3">Today's Tide Chart</p>
              <div className="overflow-x-hidden"><TideCurve /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tidePoints.filter(p => p.type).map(({ time, h, type }) => (
                <div key={time + type} className={`rounded-xl p-3 border text-center ${type === "High" ? "bg-cyan-900/25 border-cyan-500/20" : "bg-slate-800/60 border-white/8"}`}>
                  <p className={`font-bold text-sm ${type === "High" ? "text-cyan-400" : "text-slate-300"}`}>{type} Tide</p>
                  <p className="text-white font-black text-lg">{h} ft</p>
                  <p className="text-slate-500 text-xs">{time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "AI Report" && (
          <div className="space-y-3">
            <div className="bg-emerald-900/25 rounded-2xl border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-3"><Bot className="h-4 w-4 text-emerald-400" /><span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">AI Surf Report</span></div>
              <p className="text-slate-200 text-sm leading-relaxed">Solid overhead sets rolling in from the NW at 4-5ft with a long 17-second period. Light north winds sitting at 5mph keeping faces clean — classic offshore conditions for Mavericks.</p>
            </div>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Wind Classification</p>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><p className="text-emerald-400 font-semibold text-sm">Offshore — North winds at Mavericks (West-facing)</p></div>
              <p className="text-slate-400 text-xs mt-1">North winds blow from land to sea at this West-facing break, creating clean, groomed faces.</p>
            </div>
            <div className="bg-slate-800/60 rounded-2xl border border-white/8 p-4">
              <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Best Window Today</p>
              <p className="text-white font-bold text-sm">7 AM – 10 AM</p>
              <p className="text-slate-400 text-xs mt-1">Before sea breeze fills in from the SW around midday. Tide is rising through the morning, helping push in swell.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
