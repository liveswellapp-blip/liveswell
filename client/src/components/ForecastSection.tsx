import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: forecast = [], isLoading, error } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000,
  });

  const scrollTo = useCallback((index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft - 0, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !el.children.length) return;
    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 12; // +gap
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(idx, (el.children.length - 1))));
  }, []);

  if (error) {
    return (
      <div className="w-full">
        <div className="w-full border-b border-white/[0.08] mt-8 mb-4" />
        <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4 mb-6">
          <p className="text-destructive text-sm text-center">Unable to load forecast data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const isToday = (d: ForecastDay) =>
    d.date.toLowerCase() === "today" || d.date.toLowerCase().startsWith("today");

  const total = isLoading ? 5 : forecast.length;

  return (
    <div className="w-full">
      <div className="w-full border-b border-white/[0.08] mt-8 mb-4" />
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4 mb-6">

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#ffffff]">5-Day Surf Forecast</span>
          </div>
          {/* Prev / Next arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
              aria-label="Previous day"
            >
              <ChevronLeft size={13} className="text-emerald-400" />
            </button>
            <button
              onClick={() => scrollTo(Math.min(total - 1, activeIndex + 1))}
              disabled={activeIndex >= total - 1}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
              aria-label="Next day"
            >
              <ChevronRight size={13} className="text-emerald-400" />
            </button>
          </div>
        </div>

        {/* ── Cards ── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden snap-start"
                style={{ minWidth: "100%", background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-4 pt-4 pb-3 border-b border-white/5 flex justify-between">
                  <Skeleton className="h-4 w-16 bg-white/10" />
                </div>
                <div className="px-4 pt-4 pb-3 flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-10 bg-white/10" />
                    <Skeleton className="h-8 w-20 bg-white/10" />
                    <Skeleton className="h-3 w-12 bg-white/10" />
                  </div>
                  <div className="w-px bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-10 bg-white/10" />
                    <Skeleton className="h-8 w-20 bg-white/10" />
                    <Skeleton className="h-3 w-12 bg-white/10" />
                  </div>
                </div>
                <div className="px-3 pb-3 mt-2">
                  <Skeleton className="h-[120px] w-full rounded-xl bg-white/5" />
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
                    minWidth: "100%",
                    background: "linear-gradient(160deg, #030912 0%, #091a35 100%)",
                    border: today
                      ? "1px solid rgba(255,255,255,0.18)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Day header */}
                  <div className="px-4 pt-4 pb-3 border-b border-white/5">
                    <span className={`text-sm font-bold ${today ? "text-emerald-400" : "text-slate-300"}`}>
                      {day.date}
                    </span>
                  </div>
                  {/* Wave + wind — side by side */}
                  <div className="px-4 pt-4 pb-3 flex gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Wave</p>
                      <p className="text-emerald-400 font-black mb-1 text-[26px] leading-none">{day.waveHeight}</p>
                      <p className="text-[13px] font-semibold text-[#64748b]">{day.wavePeriod}</p>
                    </div>
                    <div className="w-px bg-white/5 self-stretch" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Wind</p>
                      <p className="text-cyan-400 font-bold mb-1 text-[26px] leading-none">{day.windSpeed}</p>
                      <p className="text-slate-400 text-[13px]">{day.windDirection}</p>
                    </div>
                  </div>
                  {/* Compact tide chart */}
                  <div className="px-3 pb-2 mt-auto">
                    {day.tides && day.tides.length > 0 && (
                      <TideChart tides={day.tides} date={day.date} location={location} />
                    )}
                  </div>
                  {/* Sunrise / Sunset */}
                  {(day.sunrise || day.sunset) && (
                    <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-white/[0.06] mt-1">
                      {day.sunrise && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sunrise</span>
                          <span className="text-[11px] text-slate-400">{day.sunrise}</span>
                        </div>
                      )}
                      {day.sunset && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sunset</span>
                          <span className="text-[11px] text-slate-400">{day.sunset}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-slate-500 text-sm py-6">No forecast data available</p>
          )}
        </div>

        {/* ── Dot indicators ── */}
        {!isLoading && forecast.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {forecast.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === activeIndex ? 16 : 6,
                  height: 6,
                  background: i === activeIndex
                    ? "#10b981"
                    : "rgba(255,255,255,0.12)",
                }}
                aria-label={`Go to day ${i + 1}`}
              />
            ))}
          </div>
        )}

        <p className="text-slate-700 text-[9px] mt-3 text-center">NOAA and Open Weather Map data</p>
      </div>
    </div>
  );
}
