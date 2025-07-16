import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, Droplets, Wind } from "lucide-react";
import { Location, SurfConditions } from "@/types/weather";

interface CurrentConditionsProps {
  location: Location;
}

export default function CurrentConditions({ location }: CurrentConditionsProps) {
  const { data: conditions, isLoading, error } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date();
    const lastUpdated = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  if (error) {
    return (
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center text-red-600">
            <p>Unable to load current conditions. Please try again later.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MapPin className="sunset-orange h-5 w-5" />
            <h2 className="text-xl font-semibold dark-slate">{location.name}</h2>
          </div>
          <div className="text-sm text-gray-500">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : conditions ? (
              <>Updated {formatTimeAgo(conditions.lastUpdated)}</>
            ) : (
              "Loading..."
            )}
          </div>
        </div>
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}
        
        {/* Current Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wave Conditions */}
          <div className="bg-gradient-to-br from-ocean-blue to-sky-blue rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Waves className="h-5 w-5" />
                <span className="font-medium">Wave Height</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold">{conditions?.waveHeight || "0"}</span>
                  <span className="text-lg mb-1">ft</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <span>Period: {conditions?.wavePeriod || 0}s</span>
                  <span>Direction: {conditions?.waveDirection || "N/A"}</span>
                </>
              )}
            </div>
          </div>

          {/* Tide Information */}
          <div className="bg-gradient-to-br from-sea-green to-sky-blue rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5" />
                <span className="font-medium">Tide</span>
              </div>
              <span className="text-sm opacity-75">Current</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold">{conditions?.tideHeight || "0"}</span>
                  <span className="text-lg mb-1">ft</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <span>{conditions?.tideStatus || "Unknown"}</span>
                  <span>High: 3:24 PM</span>
                </>
              )}
            </div>
          </div>

          {/* Wind Conditions */}
          <div className="bg-gradient-to-br from-sunset-orange to-yellow-400 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wind className="h-5 w-5" />
                <span className="font-medium">Wind</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold">{conditions?.windSpeed || "0"}</span>
                  <span className="text-lg mb-1">mph</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <span>{conditions?.windDirection || "N/A"}</span>
                  <span>Gusts: {conditions?.windGusts || "0"} mph</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
