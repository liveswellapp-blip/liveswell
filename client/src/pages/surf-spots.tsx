import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Waves, Wind, Search, Heart, SlidersHorizontal, TrendingUp, TrendingDown, X } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FavoriteButton from "@/components/FavoriteButton";
import SearchModal from "@/components/SearchModal";
import { Location } from "@/types/weather";

interface SurfSpot {
  id: number;
  name: string;
  city: string;
  country: string;
  region?: string;
  latitude: string;
  longitude: string;
  difficulty?: string;
  break_type?: string;
  optimal_swell?: string;
  optimal_wind?: string;
}

interface GroupedSpots {
  [continent: string]: {
    [country: string]: {
      [state: string]: SurfSpot[];
    };
  };
}

const CONTINENT_MAP: { [key: string]: string } = {
  "USA": "North America", "Canada": "North America", "Mexico": "North America",
  "Costa Rica": "North America", "Australia": "Oceania", "Portugal": "Europe",
  "France": "Europe", "Spain": "Europe", "Indonesia": "Asia",
  "Brazil": "South America", "Chile": "South America", "South Africa": "Africa", "Fiji": "Oceania"
};

const USA_CITY_TO_STATE: { [key: string]: string } = {
  "Half Moon Bay": "California","Santa Cruz": "California","Carpinteria": "California",
  "San Clemente": "California","Malibu": "California","Manhattan Beach": "California",
  "Huntington Beach": "California","Encinitas": "California","La Jolla": "California",
  "San Francisco": "California","Oakland": "California","Monterey": "California",
  "Big Sur": "California","Laguna Beach": "California","San Diego": "California",
  "Carlsbad": "California","Pacifica": "California","Capitola": "California",
  "Carmel": "California","Pismo Beach": "California","Lompoc": "California",
  "Goleta": "California","Ventura": "California","Los Angeles": "California",
  "El Segundo": "California","Hermosa Beach": "California","Redondo Beach": "California",
  "Palos Verdes": "California","Dana Point": "California","Newport Beach": "California",
  "Seal Beach": "California","Pescadero": "California","Davenport": "California",
  "Aptos": "California","Moss Landing": "California","Pacific Grove": "California",
  "Crescent City": "California","Eureka": "California","Cayucos": "California",
  "Avila Beach": "California","Cambria": "California","Fort Bragg": "California",
  "Mendocino": "California","Shelter Cove": "California",
  "Haleiwa": "Hawaii","Honolulu": "Hawaii",
  "Cocoa Beach": "Florida","New Smyrna Beach": "Florida","Jacksonville": "Florida",
  "Sebastian": "Florida","Miami": "Florida","Vero Beach": "Florida",
  "Pensacola": "Florida","Destin": "Florida","Panama City Beach": "Florida",
  "St. Augustine": "Florida","Flagler Beach": "Florida","Ormond Beach": "Florida",
  "Daytona Beach": "Florida","Ponce Inlet": "Florida","Melbourne Beach": "Florida",
  "Indialantic": "Florida","Satellite Beach": "Florida","Fernandina Beach": "Florida",
  "Fort Myers": "Florida","Naples": "Florida","Clearwater": "Florida",
  "Bradenton": "Florida","Key Largo": "Florida","Key West": "Florida",
  "Marathon": "Florida","Islamorada": "Florida",
  "Cannon Beach": "Oregon","Manzanita": "Oregon","Seaside": "Oregon",
  "Oswald West": "Oregon","Lincoln City": "Oregon","Pacific City": "Oregon",
  "Otter Rock": "Oregon","Bandon": "Oregon","Gold Beach": "Oregon","Brookings": "Oregon",
  "La Push": "Washington","Westport": "Washington","Neah Bay": "Washington","Ocean Shores": "Washington",
  "Hampton": "New Hampshire","Rye": "New Hampshire",
  "York": "Maine","Wells": "Maine","Kennebunkport": "Maine","Biddeford": "Maine",
  "Popham Beach": "Maine","Reid State Park": "Maine",
  "Montauk": "New York","New York City": "New York","Babylon": "New York","Long Beach": "New York",
  "Manasquan": "New Jersey","Asbury Park": "New Jersey","Spring Lake": "New Jersey","Belmar": "New Jersey",
  "Narragansett": "Rhode Island","Newport": "Rhode Island","Block Island": "Rhode Island",
  "Virginia Beach": "Virginia","Cape Hatteras": "North Carolina","Kill Devil Hills": "North Carolina",
  "Nags Head": "North Carolina","Wrightsville Beach": "North Carolina","Buxton": "North Carolina",
  "Rehoboth Beach": "Delaware","Charleston": "South Carolina","Hilton Head": "South Carolina",
  "Kiawah Island": "South Carolina","Isle of Palms": "South Carolina",
  "Sullivan's Island": "South Carolina","Edisto Beach": "South Carolina",
  "Beaufort": "South Carolina","Savannah": "Georgia",
  "Gulf Shores": "Alabama","Orange Beach": "Alabama",
  "Sheboygan": "Wisconsin","Grand Haven": "Michigan","Empire": "Michigan",
  "Ludington": "Michigan","Grand Marais": "Michigan","Marquette": "Michigan",
  "Erie": "Pennsylvania","Bay Village": "Ohio",
  "Galveston": "Texas","Surfside Beach": "Texas","Freeport": "Texas",
  "South Padre Island": "Texas","Corpus Christi": "Texas","Port Aransas": "Texas",
  "Brownsville": "Texas","Port Mansfield": "Texas","Matagorda": "Texas",
  "Nantucket": "Massachusetts","Oak Bluffs": "Massachusetts","Orleans": "Massachusetts",
  "Westport Beach": "Connecticut","Fairfield": "Connecticut",
  "Grand Isle": "Louisiana","Tybee Island": "Georgia","Jekyll Island": "Georgia",
  "Myrtle Beach": "South Carolina","Folly Beach": "South Carolina",
  "Chincoteague": "Virginia","Ocean City": "Maryland","Berlin": "Maryland",
  "Bethany Beach": "Delaware","Duck": "North Carolina","Dauphin Island": "Alabama",
  "Ocean Springs": "Mississippi","Biloxi": "Mississippi",
  "Yakutat": "Alaska","Sitka": "Alaska",
  "Georgetown": "South Carolina","Tampa": "Florida","Pago Pago": "American Samoa",
  "Phippsburg": "Maine","Old Orchard Beach": "Maine",
};

const CANADA_CITY_TO_STATE: { [key: string]: string } = {
  "Tofino": "British Columbia","Ucluelet": "British Columbia",
  "Halifax": "Nova Scotia","Ingonish": "Nova Scotia"
};

const US_TERRITORY_CITY_TO_STATE: { [key: string]: string } = {
  "Rincon": "Puerto Rico","Aguadilla": "Puerto Rico","Isabela": "Puerto Rico","Dorado": "Puerto Rico",
  "Charlotte Amalie": "US Virgin Islands","Red Hook": "US Virgin Islands","Frederiksted": "US Virgin Islands",
  "Talofofo": "Guam","Dededo": "Guam",
};

const MEXICO_CITY_TO_STATE: { [key: string]: string } = {
  "Ensenada": "Baja California","Rosarito": "Baja California",
  "Todos Santos": "Baja California Sur","San Juanico": "Baja California Sur",
  "Puerto Vallarta": "Jalisco"
};

function getState(spot: SurfSpot): string {
  if (spot.country === "USA") return USA_CITY_TO_STATE[spot.city] || US_TERRITORY_CITY_TO_STATE[spot.city] || "Other";
  if (spot.country === "Canada") return CANADA_CITY_TO_STATE[spot.city] || "General";
  if (spot.country === "Mexico") return MEXICO_CITY_TO_STATE[spot.city] || "General";
  return spot.region || "General";
}

// ── SpotCard ────────────────────────────────────────────────────────────────
// Conditions are fetched lazily — only when the card scrolls into view.
// This prevents a flood of simultaneous API calls when many cards render.
function SpotCard({ spot, onSelect }: { spot: SurfSpot; onSelect: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data: conditions, isLoading: condLoading } = useQuery<any>({
    queryKey: [`/api/locations/${spot.id}/conditions`],
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: inView,
  });
  const { data: forecast, isLoading: fcLoading } = useQuery<any>({
    queryKey: [`/api/locations/${spot.id}/forecast`],
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: inView,
  });

  const isLoading = inView && (condLoading || fcLoading);

  // Wave
  let waveDisplay = "—";
  if (conditions) {
    const period = conditions.wavePeriod ? ` @ ${Math.round(parseFloat(conditions.wavePeriod))}s` : "";
    if (conditions.primaryBuoy && conditions.backupBuoy) {
      const lo = Math.round(Math.min(parseFloat(conditions.primaryBuoy.waveHeight), parseFloat(conditions.backupBuoy.waveHeight)));
      const hi = Math.round(Math.max(parseFloat(conditions.primaryBuoy.waveHeight), parseFloat(conditions.backupBuoy.waveHeight)));
      waveDisplay = lo === hi ? `${lo} ft${period}` : `${lo}–${hi} ft${period}`;
    } else if (conditions.primaryBuoy) {
      waveDisplay = `${Math.round(parseFloat(conditions.primaryBuoy.waveHeight))} ft${period}`;
    } else if (conditions.waveHeight) {
      waveDisplay = `${Math.round(parseFloat(conditions.waveHeight))} ft${period}`;
    }
  }

  const windDisplay = conditions
    ? `${Math.round(parseFloat(conditions.windSpeed || "0"))} mph ${conditions.windDirection || ""}`
    : "—";

  let tideDisplay = "—";
  let tideType: "High" | "Low" = "High";
  if (conditions) {
    // conditions.tideHigh / tideLow carry today's actual tide times (from NOAA or fallback).
    // forecast[0] starts at "Tomorrow" and its times are prefixed "Est." — don't use those.
    const highTides: any[] = (conditions.tideHigh || []).map((t: any) => ({ ...t, type: "high" }));
    const lowTides:  any[] = (conditions.tideLow  || []).map((t: any) => ({ ...t, type: "low"  }));
    const allTides = [...highTides, ...lowTides];

    if (allTides.length > 0) {
      // Get the current minutes-since-midnight in the location's timezone
      const tz: string = conditions.timezone || "UTC";
      const now = new Date();
      const timeParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(now);
      const locHour = parseInt(timeParts.find(p => p.type === "hour")?.value ?? "0");
      const locMin  = parseInt(timeParts.find(p => p.type === "minute")?.value ?? "0");
      const nowMins = locHour * 60 + locMin;

      const parsed = allTides
        .map((t: any) => {
          const rawTime: string = t.time || "";
          const [hStr, rest] = rawTime.split(":");
          const mStr = rest?.slice(0, 2) ?? "0";
          const period = rest?.slice(3)?.trim().toUpperCase() ?? "";
          let h24 = parseInt(hStr) || 0;
          if (period === "PM" && h24 !== 12) h24 += 12;
          else if (period === "AM" && h24 === 12) h24 = 0;
          return { ...t, tideMins: h24 * 60 + parseInt(mStr) };
        })
        .filter((t: any) => t.tideMins > nowMins)
        .sort((a: any, b: any) => a.tideMins - b.tideMins);

      if (parsed.length > 0) {
        const next = parsed[0];
        tideType = (next.type.charAt(0).toUpperCase() + next.type.slice(1)) as "High" | "Low";
        tideDisplay = `${tideType} ${next.time}`;
      }
    }
  }

  const TideIcon = tideType === "High" ? TrendingUp : TrendingDown;

  return (
    <div
      ref={ref}
      onClick={() => onSelect(spot.id)}
      className="rounded-2xl p-3 cursor-pointer flex flex-col gap-2 active:scale-[0.98] transition-transform relative"
      style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}
    >
      {/* Name + location */}
      <div className="min-w-0 pr-1">
        <p className="text-white text-[14px] font-bold leading-tight truncate">{spot.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={10} className="text-slate-500 flex-shrink-0" />
          <p className="text-slate-500 text-[11px] leading-tight truncate">{spot.city}, {spot.country}</p>
        </div>
      </div>
      {/* Conditions — lazy loaded */}
      {!inView || isLoading ? (
        <div className="space-y-1">
          <Skeleton className="h-3 w-24 bg-white/5" />
          <Skeleton className="h-3 w-20 bg-white/5" />
          <Skeleton className="h-3 w-16 bg-white/5" />
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Waves size={11} className="text-emerald-500 flex-shrink-0" />
            <span className="text-emerald-400 text-[13px] font-bold truncate">{waveDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind size={11} className="text-[#67e8f9] flex-shrink-0" />
            <span className="text-[12px] text-[#67e8f9]">{windDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TideIcon size={11} className="text-[#38bdf8] flex-shrink-0" />
            <span className="text-[12px] text-[#38bdf8]">{tideDisplay}</span>
          </div>
        </div>
      )}
      {/* Fav — bottom-right corner */}
      <div onClick={e => e.stopPropagation()} className="absolute bottom-2 right-2">
        <FavoriteButton locationId={spot.id} locationName={spot.name} size="sm" />
      </div>
    </div>
  );
}

// ── SavedGrid ────────────────────────────────────────────────────────────────
function SavedGrid({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: favorites, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Heart size={11} className="text-emerald-400" />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl p-3 h-24" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <Skeleton className="h-3 w-20 mb-1.5 bg-white/5" />
              <Skeleton className="h-2 w-14 mb-3 bg-white/5" />
              <Skeleton className="h-2 w-16 bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Heart size={11} className="text-emerald-400" />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved</span>
        </div>
        <div className="rounded-2xl px-4 py-5 text-center" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <Heart size={18} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-600 text-[11px]">No saved spots yet</p>
          <p className="text-slate-700 text-[10px] mt-0.5">Tap the heart on any spot to save it</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Heart size={11} className="text-emerald-400" />
        <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Saved</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {favorites.map(loc => (
          <SpotCard
            key={loc.id}
            spot={{ id: loc.id, name: loc.name, city: loc.city, country: loc.country, latitude: String(loc.latitude), longitude: String(loc.longitude) }}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SurfSpots() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContinent, setSelectedContinent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "1") {
      setShowSearchModal(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const { data: spots, isLoading } = useQuery<SurfSpot[]>({
    queryKey: ["/api/locations/search", "all"],
    queryFn: async () => {
      const res = await fetch("/api/locations/all");
      if (!res.ok) throw new Error("Failed to fetch surf spots");
      return res.json();
    },
  });

  const groupedSpots = useMemo((): GroupedSpots => {
    if (!spots) return {};
    return spots.reduce((acc, spot) => {
      const continent = CONTINENT_MAP[spot.country] || "Other";
      const state = getState(spot);
      if (!acc[continent]) acc[continent] = {};
      if (!acc[continent][spot.country]) acc[continent][spot.country] = {};
      if (!acc[continent][spot.country][state]) acc[continent][spot.country][state] = [];
      acc[continent][spot.country][state].push(spot);
      return acc;
    }, {} as GroupedSpots);
  }, [spots]);

  const filteredSpots = useMemo(() => {
    if (!spots) return [];
    const hasFilters = selectedContinent || selectedCountry || selectedState;
    const hasSearch = searchQuery.trim().length > 0;
    if (!hasFilters && !hasSearch) return [];
    return spots.filter(spot => {
      const continent = CONTINENT_MAP[spot.country] || "Other";
      const state = getState(spot);
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery.trim() ||
        spot.name.toLowerCase().includes(q) ||
        spot.city.toLowerCase().includes(q) ||
        spot.country.toLowerCase().includes(q) ||
        (spot.region && spot.region.toLowerCase().includes(q)) ||
        state.toLowerCase().includes(q);
      return matchesSearch &&
        (!selectedContinent || continent === selectedContinent) &&
        (!selectedCountry || spot.country === selectedCountry) &&
        (!selectedState || state === selectedState);
    });
  }, [spots, searchQuery, selectedContinent, selectedCountry, selectedState]);

  const continents = Object.keys(groupedSpots).sort();
  const countries = selectedContinent ? Object.keys(groupedSpots[selectedContinent] || {}).sort() : [];
  const states = selectedContinent && selectedCountry
    ? Object.keys(groupedSpots[selectedContinent]?.[selectedCountry] || {}).sort()
    : [];

  const hasActiveFilters = !!(searchQuery.trim() || selectedContinent || selectedCountry || selectedState);

  const handleSpotSelect = (spotId: number) => {
    setLocation(`/conditions?location=${spotId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedContinent("");
    setSelectedCountry("");
    setSelectedState("");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
      <Header />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 pt-6 pb-5"
        style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1200 120" preserveAspectRatio="none">
          {[0, 18, 36].map(o => (
            <path key={o} d={`M0 ${60 + o} Q300 ${50 + o} 600 ${60 + o} T1200 ${60 + o}`} stroke="#10b981" strokeWidth="1.5" fill="none" />
          ))}
        </svg>
        <div className="relative max-w-2xl mx-auto">
          <h1 className="text-white font-black text-2xl leading-tight mb-3">Global Surf Spots</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClick={() => isMobile && setShowSearchModal(true)}
                readOnly={isMobile}
                placeholder="Search spots, cities, regions…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] text-slate-300 placeholder-slate-600 outline-none"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: showFilters ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.07)",
                border: showFilters ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.1)",
              }}>
              <SlidersHorizontal size={14} className={showFilters ? "text-emerald-400" : "text-slate-400"} />
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 rounded-2xl p-3 space-y-2"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Filter by Region</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-slate-500 text-[10px] hover:text-slate-300">
                    <X size={10} /> Clear
                  </button>
                )}
              </div>
              <Select value={selectedContinent} onValueChange={v => { setSelectedContinent(v); setSelectedCountry(""); setSelectedState(""); }}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-slate-300">
                  <SelectValue placeholder="Continent" />
                </SelectTrigger>
                <SelectContent>
                  {continents.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedContinent && (
                <Select value={selectedCountry} onValueChange={v => { setSelectedCountry(v); setSelectedState(""); }}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-slate-300">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {selectedCountry === "USA" && states.length > 1 && (
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-slate-300">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 px-4 pt-5 pb-6 max-w-2xl mx-auto w-full space-y-6">

        {/* Saved */}
        <SavedGrid onSelect={handleSpotSelect} />

        {/* All Locations */}
        {isLoading ? (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">All Locations</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-3 h-24" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <Skeleton className="h-3 w-20 mb-1.5 bg-white/5" />
                  <Skeleton className="h-2 w-14 mb-3 bg-white/5" />
                  <Skeleton className="h-2 w-16 bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ) : hasActiveFilters ? (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">All Locations</span>
              <span className="text-slate-600 text-[9px]">{filteredSpots.length} results</span>
            </div>
            {filteredSpots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredSpots.map(spot => (
                  <SpotCard key={spot.id} spot={spot} onSelect={handleSpotSelect} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-8 text-center" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <MapPin size={20} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-[12px] font-semibold mb-1">No spots found</p>
                <p className="text-slate-700 text-[10px]">Try a different search or filter</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">All Locations</span>
            </div>
            <div className="rounded-2xl px-4 py-8 text-center" style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <Search size={20} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-[12px] font-semibold mb-1">Search or filter to explore spots</p>
              <p className="text-slate-700 text-[10px]">229+ locations worldwide</p>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onLocationSelect={(loc: Location) => { setShowSearchModal(false); setLocation(`/conditions?location=${loc.id}`); }}
        initialQuery=""
      />
    </div>
  );
}
