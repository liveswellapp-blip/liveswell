import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Sunrise, Sunset, Waves, Wind } from "lucide-react";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
                style={{
                  width: "min(320px, calc(100vw - 2rem))",
                  background: "linear-gradient(160deg, #030912 0%, #091a35 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
                  <Skeleton className="h-4 w-16 bg-white/10" />
                  <Skeleton className="h-7 w-7 rounded-full bg-white/10" />
                </div>
                <div className="px-4 pt-3 pb-4">
                  <Skeleton className="h-3 w-24 bg-white/10 mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-10 bg-white/10" />
                      <Skeleton className="h-7 w-20 bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-10 bg-white/10" />
                      <Skeleton className="h-7 w-20 bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-white/5">
                  <Skeleton className="h-9 w-full rounded-xl bg-white/5" />
                </div>
              </div>
            ))
          ) : forecast.length > 0 ? (
            forecast.map((day, i) => {
              const today = isToday(day);
              const isExpanded = expandedIndex === i;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 rounded-2xl overflow-hidden flex flex-col snap-start"
                  style={{
                    width: "min(320px, calc(100vw - 2rem))",
                    background: "linear-gradient(160deg, #030912 0%, #091a35 100%)",
                    border: today
                      ? "1px solid rgba(52,211,153,0.38)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Day header */}
                  <div className="px-4 pt-3 pb-2.5 border-b border-white/5 flex items-center justify-between">
                    <span className={`text-sm font-bold ${today ? "text-emerald-400" : "text-slate-200"}`}>
                      {day.date}
                    </span>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-base bg-white/[0.05] border border-white/[0.06]" aria-label={`Weather: ${day.conditions}`}>
                      {day.icon}
                    </span>
                  </div>

                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[11px] font-medium text-slate-400 truncate mb-3">{day.conditions}</p>

                    {/* Wave + wind summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Waves size={12} aria-hidden="true" />
                          <span className="text-[10px] uppercase tracking-wider font-semibold">Wave</span>
                        </div>
                        <p className="text-emerald-400 font-black text-[23px] leading-none truncate">{day.waveHeight}</p>
                        <p className="text-[12px] font-semibold text-slate-500 mt-1 truncate">{day.wavePeriod}</p>
                      </div>
                      <div className="min-w-0 border-l border-white/[0.06] pl-3">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Wind size={12} aria-hidden="true" />
                          <span className="text-[10px] uppercase tracking-wider font-semibold">Wind</span>
                        </div>
                        <p className="text-cyan-400 font-bold text-[23px] leading-none truncate">{day.windSpeed}</p>
                        <p className="text-[12px] text-slate-400 mt-1 truncate">{day.windDirection}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                      aria-expanded={isExpanded}
                      aria-controls={`forecast-details-${i}`}
                    >
                      <span className="text-[11px] font-semibold text-emerald-300">
                        {isExpanded ? "Hide details" : "More details"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={15} className="text-emerald-300" aria-hidden="true" />
                      ) : (
                        <ChevronDown size={15} className="text-emerald-300" aria-hidden="true" />
                      )}
                    </button>

                    {isExpanded && (
                      <div id={`forecast-details-${i}`} className="px-3 pb-3 border-t border-white/[0.06]">
                        <div className="grid grid-cols-2 gap-2 py-3">
                          <div className="rounded-xl bg-white/[0.035] border border-white/[0.05] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Conditions</p>
                            <p className="mt-1 text-[12px] font-medium text-slate-200">{day.conditions}</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.035] border border-white/[0.05] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Wind</p>
                            <p className="mt-1 text-[12px] font-medium text-slate-200">{day.windSpeed} {day.windDirection}</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.035] border border-white/[0.05] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Swell</p>
                            <p className="mt-1 text-[12px] font-medium text-slate-200">{day.waveHeight} · {day.wavePeriod}</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.035] border border-white/[0.05] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Weather</p>
                            <p className="mt-1 text-[12px] font-medium text-slate-200 flex items-center gap-1.5">
                              <span aria-hidden="true">{day.icon}</span>
                              <span>{day.conditions}</span>
                            </p>
                          </div>
                        </div>

                        {(day.sunrise || day.sunset) && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="rounded-xl bg-amber-400/[0.06] border border-amber-300/[0.10] px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-amber-300/80">
                                <Sunrise size={13} aria-hidden="true" />
                                <span className="text-[9px] uppercase tracking-wider font-semibold">Sunrise</span>
                              </div>
                              <p className="mt-1 text-[12px] font-medium text-slate-200">{day.sunrise ?? "Unavailable"}</p>
                            </div>
                            <div className="rounded-xl bg-orange-400/[0.06] border border-orange-300/[0.10] px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-orange-300/80">
                                <Sunset size={13} aria-hidden="true" />
                                <span className="text-[9px] uppercase tracking-wider font-semibold">Sunset</span>
                              </div>
                              <p className="mt-1 text-[12px] font-medium text-slate-200">{day.sunset ?? "Unavailable"}</p>
                            </div>
                          </div>
                        )}

                        {day.tides && day.tides.length > 0 && (
                          <div className="space-y-2.5">
                            <p className="px-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500">Tides</p>
                            <TideChart tides={day.tides} date={day.date} location={location} sunrise={day.sunrise} sunset={day.sunset} />
                            <div className="grid grid-cols-2 gap-2">
                              {day.tides.map((tide, tideIndex) => {
                                const isHighTide = tide.type === "high";
                                return (
                                  <div key={`${tide.type}-${tide.time}-${tideIndex}`} className="rounded-lg bg-white/[0.035] border border-white/[0.05] px-2.5 py-2">
                                    <p className={`text-[9px] uppercase tracking-wider font-semibold ${isHighTide ? "text-emerald-300" : "text-sky-300"}`}>
                                      {isHighTide ? "High tide" : "Low tide"}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-200">{tide.time}</p>
                                    <p className="text-[10px] text-slate-500">{tide.height.toFixed(1)} ft</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {(!day.tides || day.tides.length === 0) && (
                          <p className="rounded-xl bg-white/[0.035] border border-white/[0.05] px-3 py-2.5 text-[11px] text-slate-500">
                            Tide details are unavailable for this day.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
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
