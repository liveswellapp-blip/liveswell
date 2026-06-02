import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Waves, BarChart3, Wind, Droplets, Sun, Clock, AlertCircle } from "lucide-react";
import { Location, SurfConditions, ForecastDay } from "@/types/weather";
import TideChart from "@/components/TideChart";
import FavoriteButton from "@/components/FavoriteButton";
import AISurfSummary from "@/components/AISurfSummary";
import BuoyHistoryChart from "@/components/BuoyHistoryChart";
import { useState, useEffect } from "react";
import { getLocationTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";

interface CurrentConditionsProps {
  location: Location;
}

interface BuoyHistoricalData {
  stationId: string;
  historicalData: {
    time: string;
    hour: number;
    date: string;
    waveHeight: number;
    wavePeriod: number;
    waveDirection: string;
    stationId: string;
  }[];
  dataSource: "noaa" | "simulated";
}

interface WindForecastData {
  locationId: number;
  forecastData: {
    time: string;
    date: string;
    hour: number;
    windSpeed: number;
    windDirection: string;
    windGusts: number;
  }[];
  dataSource: "openweather";
}

function fToC(f: string | number) {
  return ((parseFloat(String(f)) - 32) * 5 / 9).toFixed(1);
}

function formatTimeAgo(timestamp: string | Date) {
  const diffMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const h = Math.floor(diffMinutes / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// ─── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({
  icon: Icon, label, value, sub, color, border, bg, onClick,
}: {
  icon: React.ElementType; label: string; value: string; sub: string;
  color: string; border: string; bg: string; onClick?: () => void;
}) {
  return (
    <div
      className={`${bg} ${border} border rounded-xl p-3 flex items-start gap-2.5 ${onClick ? "cursor-pointer active:opacity-75" : ""}`}
      onClick={onClick}
    >
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 border ${border}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[10px] font-medium leading-tight">{label}</p>
        <p className={`font-bold text-sm ${color} leading-snug`}>{value}</p>
        <p className="text-slate-500 text-[10px] leading-tight truncate">{sub}</p>
      </div>
    </div>
  );
}

export default function CurrentConditions({ location }: CurrentConditionsProps) {
  const [localTime, setLocalTime] = useState(() => {
    const tz = getLocationTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });
  });

  useEffect(() => {
    const tz = getLocationTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    const id = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }));
    }, 30000);
    return () => clearInterval(id);
  }, [location.latitude, location.longitude]);

  const [selectedBuoyStation, setSelectedBuoyStation] = useState<string | null>(null);
  const [selectedBuoyName, setSelectedBuoyName] = useState<string>("");
  const [selectedBuoyIndex, setSelectedBuoyIndex] = useState<1 | 2>(1);
  const [showBuoyHistoryModal, setShowBuoyHistoryModal] = useState(false);
  const [showWindDetailsModal, setShowWindDetailsModal] = useState(false);

  const { data: conditions, isLoading, error } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: buoyHistoryData, isLoading: buoyHistoryLoading } = useQuery<BuoyHistoricalData>({
    queryKey: [`/api/buoy/${selectedBuoyStation}/historical`],
    enabled: selectedBuoyStation !== null && showBuoyHistoryModal,
    staleTime: 30 * 60 * 1000,
  });

  const { data: windDetailsData, isLoading: windDetailsLoading } = useQuery<WindForecastData>({
    queryKey: [`/api/locations/${location.id}/wind-details`],
    enabled: showWindDetailsModal,
    staleTime: 30 * 60 * 1000,
  });

  const { data: forecast } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    refetchInterval: 15 * 60 * 1000,
  });

  const todayTides = forecast?.[0]?.tides || [];
  const primaryBuoy = (conditions as any)?.primaryBuoy;
  const backupBuoy = (conditions as any)?.backupBuoy;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="rounded-xl bg-yellow-900/20 border border-yellow-800 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold text-yellow-200">Weather Data Temporarily Unavailable</span>
          </div>
          <p className="text-yellow-300 text-sm">External weather service is experiencing connectivity issues.</p>
        </div>
      </div>
    );
  }

  // ─── Derived values ──────────────────────────────────────────────────────
  const waveH = conditions?.waveHeight ? `${parseFloat(conditions.waveHeight).toFixed(1)} ft` : "—";
  const wavePeriodVal = conditions?.wavePeriod ? `${conditions.wavePeriod} sec` : "—";
  const waveDir = conditions?.waveDirection || "";
  const windSpd = conditions?.windSpeed ? `${Math.round(parseFloat(conditions.windSpeed))} mph` : "—";
  const windDir = conditions?.windDirection || "";
  const windGusts = conditions?.windGusts ? `Gusts ${Math.round(parseFloat(conditions.windGusts))} mph` : "";
  const waterF = conditions?.waterTemp ? `${parseFloat(conditions.waterTemp).toFixed(1)}°F` : "—";
  const waterC = conditions?.waterTemp ? `${fToC(conditions.waterTemp)}°C` : "";
  const uvVal = conditions?.uvIndex != null ? String(conditions.uvIndex) : "—";
  const uvSub = conditions?.uvIndex != null
    ? conditions.uvIndex > 7 ? "Very high — SPF 50+"
    : conditions.uvIndex > 5 ? "High — use SPF 30+"
    : conditions.uvIndex > 2 ? "Moderate"
    : "Low"
    : "";
  const tideStatus = conditions?.tideStatus || "—";
  const tideH = conditions?.tideHeight ? `${parseFloat(conditions.tideHeight).toFixed(1)} ft` : "";
  const lastUpdated = conditions?.lastUpdated ? formatTimeAgo(conditions.lastUpdated) : "—";

  const stats = [
    {
      icon: Waves, label: "Wave Height", value: waveH,
      sub: waveDir ? `${waveDir} swell` : "NOAA buoy",
      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",
    },
    {
      icon: Wind, label: "Wind", value: `${windSpd} ${windDir}`.trim(),
      sub: windGusts || "OpenWeatherMap",
      color: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/10",
      onClick: () => setShowWindDetailsModal(true),
    },
    {
      icon: Waves, label: "Wave Period", value: wavePeriodVal,
      sub: "Long-period groundswell",
      color: "text-teal-400", border: "border-teal-500/20", bg: "bg-teal-500/10",
    },
    {
      icon: BarChart3, label: "Tide", value: tideStatus,
      sub: tideH ? `${tideH} · Next ${todayTides.find(t => t.type !== (tideStatus.toLowerCase().includes("high") ? "high" : "low"))?.time ?? ""}` : "NOAA Tides",
      color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/10",
    },
    {
      icon: Droplets, label: "Water Temp", value: waterF,
      sub: waterC ? `${waterC} sea surface` : "NOAA buoy",
      color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10",
    },
    {
      icon: Sun, label: "UV Index", value: uvVal,
      sub: uvSub,
      color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-3 pt-4 pb-2 space-y-3">

        {/* ── Hero card ─────────────────────────────────────────────── */}
        <div
          className="rounded-2xl relative overflow-hidden"
          style={{ background: "linear-gradient(150deg, #022c22 0%, #064e3b 45%, #0c2340 100%)" }}
        >
          {/* Subtle wave lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 220" preserveAspectRatio="none">
            {[0, 22, 44].map(o => (
              <path key={o} d={`M0 ${110+o} Q150 ${90+o} 300 ${110+o} T600 ${110+o}`}
                stroke="#10b981" strokeWidth="1.5" fill="none" />
            ))}
          </svg>

          <div className="relative px-5 pt-5 pb-5">
            {/* Location + favorite */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">{location.city}</span>
                </div>
                <h1 className="text-white font-black text-3xl leading-tight">{location.name}</h1>
              </div>
              <div className="mt-1">
                <FavoriteButton locationId={location.id} locationName={location.name} size="sm" />
              </div>
            </div>

            {/* Buoy cards */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-32 rounded-xl bg-white/10" />
                <Skeleton className="h-32 rounded-xl bg-white/10" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Buoy #1 */}
                <div className="bg-black/30 rounded-xl p-3 border border-emerald-500/25">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400 text-[10px] font-bold">Buoy #1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-slate-400" />
                      <span className="text-slate-400 text-[9px]">{lastUpdated}</span>
                    </div>
                  </div>
                  {primaryBuoy ? (
                    <>
                      <p className="text-white text-xs font-semibold leading-tight truncate">{primaryBuoy.stationName || `Buoy ${primaryBuoy.stationId}`}</p>
                      <p className="text-slate-400 text-[9px] mb-2">Station {primaryBuoy.stationId}</p>
                      {/* Wave height + period + direction in one row */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-emerald-400 font-black text-2xl leading-none">{parseFloat(primaryBuoy.waveHeight || 0).toFixed(1)}</span>
                        <span className="text-emerald-600 text-xs font-semibold">ft</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-emerald-400 text-[11px] font-semibold">{primaryBuoy.wavePeriod || 0}s</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-emerald-400 text-[11px] font-semibold">{primaryBuoy.waveDirection || "—"}</span>
                      </div>
                      <button
                        className="mt-2 w-full text-[9px] text-emerald-600 border border-emerald-700/40 rounded-lg py-1 hover:bg-emerald-900/30 transition-colors"
                        onClick={() => { setSelectedBuoyStation(primaryBuoy.stationId); setSelectedBuoyName(primaryBuoy.stationName || ""); setSelectedBuoyIndex(1); setShowBuoyHistoryModal(true); }}
                      >
                        24h History
                      </button>
                    </>
                  ) : (
                    <div className="text-slate-500 text-xs py-4 text-center">No buoy data</div>
                  )}
                </div>

                {/* Buoy #2 */}
                <div className="bg-black/30 rounded-xl p-3 border border-sky-500/25">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <span className="text-sky-400 text-[10px] font-bold">Buoy #2</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-slate-400" />
                      <span className="text-slate-400 text-[9px]">{lastUpdated}</span>
                    </div>
                  </div>
                  {backupBuoy ? (
                    <>
                      <p className="text-white text-xs font-semibold leading-tight truncate">{backupBuoy.stationName || `Buoy ${backupBuoy.stationId}`}</p>
                      <p className="text-slate-400 text-[9px] mb-2">Station {backupBuoy.stationId}</p>
                      {/* Wave height + period + direction in one row */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sky-400 font-black text-2xl leading-none">{parseFloat(backupBuoy.waveHeight || 0).toFixed(1)}</span>
                        <span className="text-sky-600 text-xs font-semibold">ft</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-sky-400 text-[11px] font-semibold">{backupBuoy.wavePeriod || 0}s</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-sky-400 text-[11px] font-semibold">{backupBuoy.waveDirection || "—"}</span>
                      </div>
                      <button
                        className="mt-2 w-full text-[9px] text-sky-600 border border-sky-700/40 rounded-lg py-1 hover:bg-sky-900/30 transition-colors"
                        onClick={() => { setSelectedBuoyStation(backupBuoy.stationId); setSelectedBuoyName(backupBuoy.stationName || ""); setSelectedBuoyIndex(2); setShowBuoyHistoryModal(true); }}
                      >
                        24h History
                      </button>
                    </>
                  ) : (
                    <div className="text-slate-500 text-xs py-4 text-center">No buoy data</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tide chart card ───────────────────────────────────────── */}
        {(todayTides.length > 0 || isLoading) && (
          <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "#0f172a" }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-slate-400 text-[11px] uppercase tracking-wide font-semibold">Tides Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{localTime} local</span>
                <span className="text-slate-600 text-[10px]">NOAA Tides &amp; Currents</span>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-36 mx-3 mb-3 rounded-lg bg-white/5" />
            ) : (
              <div className="px-3 pb-3">
                <TideChart
                  tides={todayTides}
                  date="today"
                  location={location}
                  sunrise={conditions?.sunrise}
                  sunset={conditions?.sunset}
                />
                {/* Tide times row */}
                {todayTides.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2">
                    {[...todayTides]
                      .sort((a, b) => {
                        const parseH = (s: string) => {
                          const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
                          if (!m) return 0;
                          let h = parseInt(m[1]);
                          if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
                          if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
                          return h * 60 + parseInt(m[2]);
                        };
                        return parseH(a.time) - parseH(b.time);
                      })
                      .map((tide, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold capitalize w-8 shrink-0 ${tide.type === "high" ? "text-cyan-400" : "text-slate-400"}`}>
                            {tide.type === "high" ? "High" : "Low"}
                          </span>
                          <span className="text-slate-300 text-[10px] font-medium">{tide.time}</span>
                          <span className="text-slate-500 text-[10px]">{tide.height.toFixed(1)} ft</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stat grid ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stats.map(s => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>
        )}

        {/* ── AI Surf Summary ───────────────────────────────────────── */}
        <AISurfSummary location={location} />

      </div>

      {/* ── Buoy Historical Data Modal ──────────────────────────────── */}
      <Dialog open={showBuoyHistoryModal} onOpenChange={v => { if (!v) { setShowBuoyHistoryModal(false); setSelectedBuoyStation(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none" aria-describedby={undefined}>
          <div className="rounded-2xl overflow-hidden p-5"
            style={{ background: "linear-gradient(160deg, #030f1c 0%, #041a2e 60%, #021810 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {buoyHistoryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-40 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-8 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
              </div>
            ) : buoyHistoryData && selectedBuoyStation ? (
              <BuoyHistoryChart
                stationId={selectedBuoyStation}
                stationName={selectedBuoyName}
                dataSource={buoyHistoryData.dataSource}
                historicalData={buoyHistoryData.historicalData}
                buoyIndex={selectedBuoyIndex}
              />
            ) : (
              <p className="text-center py-8 text-slate-500 text-sm">No historical data available for this buoy</p>
            )}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-slate-600 text-[9px]">Data from NOAA National Data Buoy Center</span>
              <span className="text-slate-700 text-[9px]">{buoyHistoryData?.dataSource === "noaa" ? "Live NOAA data" : "Simulated data"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Wind Details Modal ──────────────────────────────────────── */}
      <Dialog open={showWindDetailsModal} onOpenChange={setShowWindDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-900 dark:text-white pr-8">
              48-Hour Wind Forecast — {location.name}
            </DialogTitle>
          </DialogHeader>
          {windDetailsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : windDetailsData ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-50 dark:bg-emerald-900 sticky top-0 z-10">
                    <tr className="font-semibold">
                      {["Date & Time","Speed","Gusts","Direction"].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 border-r last:border-r-0 border-gray-300 dark:border-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-background">
                    {windDetailsData.forecastData.map((d, i) => {
                      const showDate = i === 0 || d.date !== windDetailsData.forecastData[i - 1].date;
                      return (
                        <tr key={i} className="hover:bg-muted/30 border-b border-emerald-200 dark:border-emerald-800 last:border-b-0">
                          <td className="py-2.5 px-3 border-r border-gray-300 dark:border-gray-600 font-medium">
                            {showDate && <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">{d.date}</div>}
                            {d.time}
                          </td>
                          <td className="py-2.5 px-3 border-r border-gray-300 dark:border-gray-600 text-emerald-600 dark:text-emerald-400 font-semibold">{d.windSpeed} mph</td>
                          <td className="py-2.5 px-3 border-r border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400">{d.windGusts} mph</td>
                          <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">{d.windDirection}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No wind forecast data available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
