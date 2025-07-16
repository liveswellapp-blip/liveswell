import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, Wind } from "lucide-react";
import { Location, NearbySpot } from "@/types/weather";

interface NearbySpotsProps {
  location: Location;
}

export default function NearbySpots({ location }: NearbySpotsProps) {
  const { data: nearbySpots = [], isLoading, error } = useQuery<NearbySpot[]>({
    queryKey: ["/api/locations", location.id, "nearby"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (error) {
    return (
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 dark-slate">Nearby Surf Spots</h3>
          <div className="text-center text-red-600">
            <p>Unable to load nearby spots. Please try again later.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 dark-slate">Nearby Surf Spots</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-alice-blue rounded-lg p-4">
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
              <div
                key={spot.id}
                className="bg-alice-blue rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={`https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100&q=80`}
                    alt={spot.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold dark-slate">{spot.name}</h4>
                    <p className="text-sm text-gray-600">{spot.distance} miles away</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Waves className="ocean-blue h-4 w-4" />
                    <span className="font-medium dark-slate">{spot.waveHeight}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind className="sunset-orange h-4 w-4" />
                    <span className="text-sm text-gray-600">{spot.wind}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              <p>No nearby surf spots found</p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
