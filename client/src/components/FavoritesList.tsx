import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, MapPin, Heart, LogIn, Wind } from "lucide-react";
import { Location } from "@/types/weather";
import FavoriteButton from "./FavoriteButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

// Component to fetch and display conditions for a single spot
function SpotConditions({ locationId }: { locationId: number }) {
  const { data: conditions, isLoading: conditionsLoading } = useQuery<any>({
    queryKey: [`/api/locations/${locationId}/conditions`],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery<any>({
    queryKey: [`/api/locations/${locationId}/forecast`],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  if (conditionsLoading || forecastLoading) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  if (!conditions) {
    return null;
  }

  // Calculate wave height range from buoys
  let waveDisplay = "N/A";
  const waveDirection = conditions.waveDirection || "N/A";
  const wavePeriod = conditions.wavePeriod || "0";
  
  if (conditions.primaryBuoy && conditions.backupBuoy) {
    const minHeight = Math.round(Math.min(parseFloat(conditions.primaryBuoy.waveHeight), parseFloat(conditions.backupBuoy.waveHeight)));
    const maxHeight = Math.round(Math.max(parseFloat(conditions.primaryBuoy.waveHeight), parseFloat(conditions.backupBuoy.waveHeight)));
    waveDisplay = `${minHeight}-${maxHeight} ft ${waveDirection} @ ${wavePeriod} sec`;
  } else if (conditions.primaryBuoy) {
    waveDisplay = `${Math.round(parseFloat(conditions.primaryBuoy.waveHeight))} ft ${waveDirection} @ ${wavePeriod} sec`;
  } else if (conditions.waveHeight) {
    waveDisplay = `${Math.round(parseFloat(conditions.waveHeight))} ft ${waveDirection} @ ${wavePeriod} sec`;
  }

  // Format wind data
  const windSpeed = Math.round(parseFloat(conditions.windSpeed || "0"));
  const windDir = conditions.windDirection || "N/A";
  const windDisplay = `${windSpeed} mph ${windDir}`;

  // Get next tide
  let tideDisplay = "N/A";
  if (forecast?.[0]?.tides?.length > 0) {
    const tideStatus = conditions.tideStatus?.toLowerCase();
    const targetType = tideStatus === 'rising' ? 'high' : 'low';
    
    // Find next tide of target type
    const tidesOfType = forecast[0].tides.filter((t: any) => t.type.toLowerCase() === targetType);
    if (tidesOfType.length > 0) {
      const nextTide = tidesOfType[0];
      const tideType = nextTide.type.charAt(0).toUpperCase() + nextTide.type.slice(1);
      tideDisplay = `${tideType} Tide ${nextTide.time}`;
    }
  }

  return (
    <div className="flex flex-col gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium items-end">
      <div>{waveDisplay}</div>
      <div>{windDisplay}</div>
      <div>{tideDisplay}</div>
    </div>
  );
}

interface FavoritesListProps {
  onLocationSelect?: (location: Location) => void;
}

export default function FavoritesList({ onLocationSelect }: FavoritesListProps) {
  const { isAuthenticated } = useAuth();
  
  const { data: favorites, isLoading, error } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <LogIn className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-muted-foreground mb-2">Sign in to save your favorite surf spots</p>
              <p className="text-sm text-muted-foreground">Keep track of conditions at your preferred locations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load favorites</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto text-blue-900 dark:text-emerald-400 mb-4" />
            <p className="text-blue-900 dark:text-emerald-400 mb-2">No surf spots saved yet</p>
            <p className="text-sm text-blue-900 dark:text-emerald-400">
              Click the wave icon on any surf spot to save it to your list
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
          <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
          <span>Saved</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {favorites.map((location) => (
            <div
              key={location.id}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer"
              onClick={() => onLocationSelect?.(location)}
            >
              <div className="flex-shrink-0">
                <FavoriteButton
                  locationId={location.id}
                  locationName={location.name}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-blue-900 dark:text-white truncate">{location.name}</h3>
                <p className="text-sm text-blue-900 dark:text-white truncate">
                  {location.city}, {location.country}
                </p>
              </div>
              <div className="flex-shrink-0">
                <SpotConditions locationId={location.id} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}