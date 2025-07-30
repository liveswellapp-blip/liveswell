import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, Wind } from "lucide-react";
import { Link } from "wouter";
import { Location, NearbySpot } from "@/types/weather";

interface NearbySpotsProps {
  location: Location;
}

export default function NearbySpots({ location }: NearbySpotsProps) {
  const { data: nearbySpots = [], isLoading, error } = useQuery<NearbySpot[]>({
    queryKey: [`/api/locations/${location.id}/nearby`],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (error) {
    return (
      <section className="container mx-auto px-4 py-8">
        <Card className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">Nearby Surf Spots</h3>
          <div className="text-center text-red-600">
            <p className="text-destructive">Unable to load nearby spots. Please try again later.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <Card className="bg-card rounded-xl shadow-lg p-6 border border-border">
        <h3 className="text-xl font-semibold mb-4 text-black dark:text-white">Nearby Surf Spots</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))
          ) : nearbySpots.length > 0 ? (
            nearbySpots.map((spot) => (
              <Link key={spot.id} to={`/conditions?location=${spot.id}`}>
                <div className="bg-muted rounded-lg p-4 hover:shadow-md hover:bg-muted/80 transition-all cursor-pointer border border-border">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Waves className="h-6 w-6 text-emerald-600 dark:text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{spot.name}</h4>
                      <p className="text-sm text-blue-900 dark:text-white">{spot.distance} miles away</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Waves className="text-blue-900 dark:text-white h-4 w-4" />
                      <span className="font-medium text-blue-900 dark:text-emerald-400">{spot.waveHeight}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wind className="text-blue-900 dark:text-white h-4 w-4" />
                      <span className="text-sm text-blue-900 dark:text-emerald-400">{spot.wind}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center text-blue-900 dark:text-emerald-400">
              <p>No nearby surf spots found</p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
