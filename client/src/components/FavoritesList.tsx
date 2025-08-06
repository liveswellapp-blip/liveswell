import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, MapPin, Heart, LogIn } from "lucide-react";
import { Location } from "@/types/weather";
import FavoriteButton from "./FavoriteButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
              <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-900 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-blue-900 dark:text-white truncate">{location.name}</h3>
                <p className="text-sm text-blue-900 dark:text-white truncate">
                  {location.city}, {location.country}
                </p>
              </div>
              <div className="flex-shrink-0">
                <FavoriteButton
                  locationId={location.id}
                  locationName={location.name}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}