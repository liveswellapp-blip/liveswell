import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves } from "lucide-react";
import { useLocation } from "wouter";
import { Location, NearbySpot } from "@/types/weather";

interface NearbySpotsProps {
  location: Location;
}

export default function NearbySpots({ location }: NearbySpotsProps) {
  const [, setLocation] = useLocation();

  const { data: nearbySpots = [], isLoading, error } = useQuery<NearbySpot[]>({
    queryKey: [`/api/locations/${location.id}/nearby`],
    staleTime: 10 * 60 * 1000,
  });

  const handleSpotClick = (spotId: number) => {
    const newUrl = `/conditions?location=${spotId}`;
    window.history.pushState(null, "", newUrl);
    const popStateEvent = new PopStateEvent("popstate", { state: null });
    window.dispatchEvent(popStateEvent);
    setLocation(newUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="w-full">
        <div className="w-full border-b border-emerald-500/30 mt-8 mb-4" />
        <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-6 mb-6">
          <p className="text-destructive text-sm text-center">Unable to load nearby spots. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-b border-emerald-500/30 mt-8 mb-4" />
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-6 mb-6">

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#ffffff]">Nearby Surf Spots</span>
          </div>
          <span className="text-slate-500 text-[10px]">within 30 miles</span>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-3"
                style={{ background: "linear-gradient(160deg, #030912 0%, #091a35 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="flex items-start justify-between mb-2">
                  <Skeleton className="w-8 h-8 rounded-xl bg-white/10" />
                  <Skeleton className="h-3 w-12 bg-white/10" />
                </div>
                <Skeleton className="h-3 w-full bg-white/10 mb-1" />
                <Skeleton className="h-3 w-16 bg-white/10" />
              </div>
            ))
          ) : nearbySpots.length > 0 ? (
            nearbySpots.slice(0, 6).map((spot) => (
              <div
                key={spot.id}
                onClick={() => handleSpotClick(spot.id)}
                data-testid={`card-nearby-spot-${spot.id}`}
                className="rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(160deg, #030912 0%, #091a35 100%)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                {/* Distance */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-slate-500 text-[9px]"
                    data-testid={`text-spot-distance-${spot.id}`}>
                    {spot.distance} mi
                  </span>
                </div>

                {/* Spot name */}
                <p className="text-white text-[11px] font-semibold leading-tight mb-2"
                  data-testid={`text-spot-name-${spot.id}`}>
                  {spot.name}
                </p>

                {/* Wave / Wind — side by side, forecast card style */}
                {(spot.waveHeight || spot.wind) && (
                  <div className="flex gap-2 mt-1">
                    {spot.waveHeight && (
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 text-[8px] uppercase tracking-wider font-semibold mb-0.5">Wave</p>
                        <p className="text-emerald-400 font-black text-[16px] leading-none">{spot.waveHeight}</p>
                      </div>
                    )}
                    {spot.waveHeight && spot.wind && (
                      <div className="w-px bg-white/5 self-stretch" />
                    )}
                    {spot.wind && (
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 text-[8px] uppercase tracking-wider font-semibold mb-0.5">Wind</p>
                        <p className="text-cyan-400 font-bold text-[16px] leading-none">{spot.wind}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="col-span-full text-slate-500 text-sm text-center py-6">No nearby surf spots found</p>
          )}
        </div>

      </div>
    </div>
  );
}
