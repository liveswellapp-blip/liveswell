import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useRef } from "react";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: forecast = [], isLoading, error } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000,
  });

  if (error) {
    return (
      <div className="w-full">
        <div className="w-full border-b border-emerald-500/30 mt-8 mb-4" />
        <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4 mb-6">
          <p className="text-destructive text-sm text-center">Unable to load forecast data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const isToday = (d: ForecastDay) =>
    d.date.toLowerCase() === "today" || d.date.toLowerCase().startsWith("today");

  return (
    <div className="w-full">
      <div className="w-full border-b border-emerald-500/30 mt-8 mb-4" />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4 mb-6">

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">5-Day Surf Forecast</span>
          </div>
          <span className="text-slate-500 text-[10px]">{location.name}</span>
        </div>

        {/* ── Cards ── */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden snap-start"
                style={{ minWidth: 175, background: "linear-gradient(160deg,#030f1c 0%,#041a2e 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-3 pt-3 pb-2 border-b border-white/5 flex justify-between">
                  <Skeleton className="h-3 w-12 bg-white/10" />
                  <Skeleton className="h-3 w-8 bg-white/10" />
                </div>
                <div className="px-3 pt-2.5 pb-2 space-y-1.5">
                  <Skeleton className="h-6 w-16 bg-white/10" />
                  <Skeleton className="h-3 w-20 bg-white/10" />
                  <Skeleton className="h-3 w-24 bg-white/10" />
                </div>
                <div className="px-2 pb-2 mt-2">
                  <Skeleton className="h-[98px] w-full rounded-xl bg-white/5" />
                </div>
              </div>
            ))
          ) : forecast.length > 0 ? (
            forecast.map((day, i) => {
              const today = isToday(day);
              return (
                <div
                  key={i}
                  className="flex-shrink-0 rounded-2xl overflow-hidden flex flex-col snap-start"
                  style={{
                    minWidth: 175,
                    flex: "1 0 175px",
                    background: today
                      ? "linear-gradient(160deg,#04202e 0%,#053040 100%)"
                      : "linear-gradient(160deg,#030f1c 0%,#041a2e 100%)",
                    border: today
                      ? "1px solid rgba(16,185,129,0.22)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Day header */}
                  <div className="px-3 pt-3 pb-2 border-b border-white/5 flex items-baseline justify-between">
                    <span className={`text-xs font-bold ${today ? "text-emerald-400" : "text-slate-300"}`}>
                      {day.date}
                    </span>
                  </div>

                  {/* Wave + wind data — side by side */}
                  <div className="px-3 pt-2.5 pb-2 flex gap-2">
                    {/* Left: Wave */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600 text-[8px] uppercase tracking-wider font-semibold mb-0.5">Wave</p>
                      <p className="text-emerald-400 font-black text-lg leading-none mb-0.5">{day.waveHeight}</p>
                      <p className="text-teal-500 text-[10px] font-semibold">{day.wavePeriod}</p>
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-white/5 self-stretch" />
                    {/* Right: Wind */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600 text-[8px] uppercase tracking-wider font-semibold mb-0.5">Wind</p>
                      <p className="text-cyan-400 font-bold text-lg leading-none mb-0.5">{day.windSpeed}</p>
                      <p className="text-slate-500 text-[10px]">{day.windDirection}</p>
                    </div>
                  </div>

                  {/* Compact tide chart */}
                  <div className="px-2 pb-2 mt-auto">
                    {day.tides && day.tides.length > 0 && (
                      <TideChart tides={day.tides} date={day.date} location={location} />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-500 text-sm py-6">No forecast data available</p>
          )}
        </div>

        {/* Footer note */}
        <p className="text-slate-700 text-[9px] mt-3">NOAA wave forecast · OpenWeatherMap wind</p>
      </div>
    </div>
  );
}
