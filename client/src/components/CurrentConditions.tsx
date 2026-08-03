import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Waves, BarChart3, Wind, Droplets, Sun, Clock, AlertCircle, RefreshCw, Check } from "lucide-react";
import { Location, SurfConditions, ForecastDay } from "@/types/weather";
import TideChart from "@/components/TideChart";
import FavoriteButton from "@/components/FavoriteButton";
import BuoyHistoryChart from "@/components/BuoyHistoryChart";
import WindForecastChart from "@/components/WindForecastChart";
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
      className={`border border-white/[0.08] rounded-xl p-3 flex items-start gap-2.5 ${onClick ? "cursor-pointer active:opacity-75" : ""}`}
      style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}
      onClick={onClick}
    >
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 border ${border}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium leading-tight text-[#ffffff]">{label}</p>
        <p className={`font-bold text-sm ${color} leading-snug`}>{value}</p>
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

  const queryClient = useQueryClient();
  const [refreshState, setRefreshState] = useState<"idle" | "spinning" | "done">("idle");

  function handleRefresh() {
    if (refreshState !== "idle") return;
    setRefreshState("spinning");
    queryClient.invalidateQueries({ queryKey: [`/api/locations/${location.id}/conditions`] });
    queryClient.invalidateQueries({ queryKey: [`/api/locations/${location.id}/forecast`] });
    setTimeout(() => {
      setRefreshState("done");
      setTimeout(() => setRefreshState("idle"), 2000);
    }, 1500);
  }

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

  const waveRangeDisplay = (() => {
    const p = (conditions as any)?.primaryBuoy;
    const b = (conditions as any)?.backupBuoy;
    const h1 = p?.waveHeight ? parseFloat(p.waveHeight) : null;
    const h2 = b?.waveHeight ? parseFloat(b.waveHeight) : null;
    if (h1 !== null && h2 !== null) {
      const lo = Math.round(Math.min(h1, h2));
      const hi = Math.round(Math.max(h1, h2));
      if (lo !== hi) return `${lo}–${hi} ft`;
    }
    const single = h1 ?? h2;
    return single !== null ? `${Math.round(single)} ft` : waveH;
  })();
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
      icon: Waves, label: "Wave Height", value: waveRangeDisplay,
      sub: waveDir ? `${waveDir} swell` : "NOAA buoy",
      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",
    },
    {
      icon: Clock, label: "Wave Period", value: wavePeriodVal,
      sub: "Long-period groundswell",
      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",
    },
    {
      icon: Droplets, label: "Water Temp", value: waterF,
      sub: waterC ? `${waterC} sea surface` : "NOAA buoy",
      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",
    },
    {
      icon: Sun, label: "UV Index", value: uvVal,
      sub: uvSub,
      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="w-full">
      {/* ── Location header — above the card ─────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span className="text-xs font-semibold text-[#94a3b8]">{location.city}</span>
            </div>
            <h1 className="text-white font-black text-3xl leading-tight">{location.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {lastUpdated !== "—" && (
              <span className="text-[9px] text-slate-600">Updated {lastUpdated}</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshState === "spinning"}
              aria-label="Refresh conditions"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              style={{
                background: refreshState === "done" ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.07)",
                border: refreshState === "done" ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {refreshState === "done"
                ? <Check size={13} className="text-emerald-400" />
                : <RefreshCw size={13} className={`text-slate-400 ${refreshState === "spinning" ? "animate-spin" : ""}`} />
              }
            </button>
            <FavoriteButton locationId={location.id} locationName={location.name} size="sm" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 pb-2 space-y-3">

        {/* ── Swell card ────────────────────────────────────────────── */}
        <div
          className="rounded-xl border border-white/[0.08] overflow-hidden"
          style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span className="text-[11px] uppercase tracking-wide font-semibold text-[#ffffff]">Swell</span>
            </div>
            <span className="text-slate-500 text-[9px]">NOAA / Open-Meteo</span>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
                <Skeleton className="h-7 w-full rounded-lg bg-white/5" />
              </div>
            </div>
          )}

          {!isLoading && primaryBuoy && (
            <div className={`px-4 pb-4 ${backupBuoy ? 'grid grid-cols-2 gap-px' : ''}`}>

              {/* ── Buoy #1 column ── */}
              <div className={backupBuoy ? 'pr-4' : ''}>
                <p className="text-white text-[11px] font-semibold leading-tight truncate">
                  {primaryBuoy.stationName || `Buoy ${primaryBuoy.stationId}`}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5 mb-3">
                  {primaryBuoy.stationId === 'open-meteo' ? 'Global wave model' : `Station ${primaryBuoy.stationId}`}
                </p>
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Height</span>
                    <span className="text-[20px] font-black text-emerald-400 leading-none">{parseFloat(primaryBuoy.waveHeight || 0).toFixed(1)} ft</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Period</span>
                    <span className="text-[14px] font-black text-emerald-400">{primaryBuoy.wavePeriod || 0} sec</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Direction</span>
                    <span className="text-[14px] font-black text-emerald-400">{primaryBuoy.waveDirection || "—"}</span>
                  </div>
                </div>
                {primaryBuoy.stationId !== 'open-meteo' && (
                  <button
                    className="mt-3 w-full text-[9px] bg-emerald-500/15 border border-emerald-500/30 rounded-lg py-1.5 hover:bg-emerald-500/25 transition-colors font-medium text-[#34d399]"
                    onClick={() => { setSelectedBuoyStation(primaryBuoy.stationId); setSelectedBuoyName(primaryBuoy.stationName || ""); setSelectedBuoyIndex(1); setShowBuoyHistoryModal(true); }}
                  >Wave History</button>
                )}
              </div>

              {/* ── Buoy #2 column ── */}
              {backupBuoy && (
                <div className="pl-4 border-l border-white/[0.08]">
                  <p className="text-white text-[11px] font-semibold leading-tight truncate">
                    {backupBuoy.stationName || `Buoy ${backupBuoy.stationId}`}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 mb-3">Station {backupBuoy.stationId}</p>
                  <div className="flex flex-col divide-y divide-white/[0.06]">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Height</span>
                      <span className="text-[20px] font-black text-[#67e8f9] leading-none">{parseFloat(backupBuoy.waveHeight || 0).toFixed(1)} ft</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Period</span>
                      <span className="text-[14px] font-black text-[#67e8f9]">{backupBuoy.wavePeriod || 0} sec</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Direction</span>
                      <span className="text-[14px] font-black text-[#67e8f9]">{backupBuoy.waveDirection || "—"}</span>
                    </div>
                  </div>
                  <button
                    className="mt-3 w-full text-[9px] bg-cyan-400/15 border border-cyan-400/30 rounded-lg py-1.5 hover:bg-cyan-400/25 transition-colors font-medium text-[#67e8f9]"
                    onClick={() => { setSelectedBuoyStation(backupBuoy.stationId); setSelectedBuoyName(backupBuoy.stationName || ""); setSelectedBuoyIndex(2); setShowBuoyHistoryModal(true); }}
                  >Wave History</button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !primaryBuoy && (
            <p className="text-slate-500 text-xs text-center py-6 px-4">No buoy data available</p>
          )}
        </div>

        {/* ── Wind card ─────────────────────────────────────────────── */}
        {conditions && (
          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span className="text-[11px] uppercase tracking-wide font-semibold text-[#ffffff]">Wind</span>
              </div>
              <span className="text-slate-500 text-[9px]">OpenWeatherMap API</span>
            </div>
            <div className="px-4 pb-3 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-black text-2xl leading-none text-[#38bdf8]">{Math.round(parseFloat(conditions.windSpeed || "0"))}</span>
                <span className="text-xs font-semibold text-[#38bdf8]">mph</span>
                <span className="text-sm font-semibold text-[#38bdf8]">{conditions.windDirection}</span>
                {conditions.windGusts && parseFloat(conditions.windGusts) > parseFloat(conditions.windSpeed || "0") && (
                  <>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-[11px] text-[#38bdf8]">Gusts {Math.round(parseFloat(conditions.windGusts))} mph</span>
                  </>
                )}
              </div>
              <button
                className="text-[9px] bg-sky-400/15 border border-sky-400/30 rounded-lg px-3 py-1.5 hover:bg-sky-400/25 transition-colors shrink-0 text-[#38bdf8]"
                onClick={() => setShowWindDetailsModal(true)}
              >Wind Forecast</button>
            </div>
          </div>
        )}

        {/* ── Tide chart card ───────────────────────────────────────── */}
        {(todayTides.length > 0 || isLoading) && (
          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span className="text-[11px] uppercase tracking-wide font-semibold text-[#ffffff]">Tides</span>
              </div>
              <span className="text-slate-500 text-[10px]">{localTime} local</span>
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
                          <span className="text-[10px] font-semibold capitalize w-8 shrink-0 text-[#94a3b8]">
                            {tide.type === "high" ? "High" : "Low"}
                          </span>
                          <span className="text-[10px] font-medium text-[#34d399]">{tide.time}</span>
                          <span className="text-slate-500 text-[10px]">{tide.height.toFixed(1)} ft</span>
                        </div>
                      ))}
                  </div>
                )}
                {/* Sunrise / sunset row */}
                {(conditions?.sunrise || conditions?.sunset) && (
                  <div className="mt-2 flex items-center gap-4">
                    {conditions.sunrise && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[9px] uppercase tracking-wider">Sunrise</span>
                        <span className="text-[10px] font-semibold text-[#38bdf8]">{conditions.sunrise}</span>
                      </div>
                    )}
                    {conditions.sunset && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[9px] uppercase tracking-wider">Sunset</span>
                        <span className="text-[10px] font-semibold text-[#38bdf8]">{conditions.sunset}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                  <span className="text-slate-600 text-[9px]">NOAA Tides & Currents data</span>
                </div>
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


      </div>
      {/* ── Buoy Historical Data Modal ──────────────────────────────── */}
      <Dialog open={showBuoyHistoryModal} onOpenChange={v => { if (!v) { setShowBuoyHistoryModal(false); setSelectedBuoyStation(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none" aria-describedby={undefined}>
          <div className="rounded-2xl overflow-hidden p-5"
            style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none" aria-describedby={undefined}>
          <div className="rounded-2xl overflow-hidden p-5"
            style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {windDetailsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-40 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-8 w-full rounded-xl bg-white/5" />
                <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
              </div>
            ) : windDetailsData ? (
              <WindForecastChart
                locationName={location.name}
                forecastData={windDetailsData.forecastData}
              />
            ) : (
              <p className="text-center py-8 text-slate-500 text-sm">No wind forecast data available</p>
            )}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-slate-600 text-[9px]">Data from OpenWeatherMap</span>
              <span className="text-slate-700 text-[9px]">48-hour forecast</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
