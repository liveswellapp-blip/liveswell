import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind } from "lucide-react";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const { data: forecast = [], isLoading, error } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  if (error) {
    return (
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center text-red-600">
            <p>Unable to load forecast data. Please try again later.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 dark-slate">5-Day Surf Forecast</h3>
        
        {/* Forecast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {isLoading ? (
            // Loading skeletons
            (Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-alice-blue rounded-lg p-4">
                <div className="text-center space-y-2">
                  <Skeleton className="h-5 w-16 mx-auto" />
                  <Skeleton className="h-8 w-8 mx-auto rounded-full" />
                  <Skeleton className="h-6 w-12 mx-auto" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              </div>
            )))
          ) : forecast.length > 0 ? (
            forecast.map((day, index) => (
              <div key={index} className="rounded-lg p-4 hover:shadow-md transition-shadow bg-[#efefef]">
                <div className="text-left">
                  <div className="font-medium dark-slate mb-2 text-[20px]">
                    {index === 0 ? "Today" : day.date}
                  </div>
                  <div className="text-lg font-semibold ocean-blue mb-1">{day.waveHeight}</div>
                  <div className="text-sm text-gray-600 mb-2">{day.conditions}</div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                    <Wind className="h-3 w-3" />
                    <span>{day.wind}</span>
                  </div>
                </div>
                
                {/* Tide Chart */}
                {day.tides && day.tides.length > 0 && (
                  <TideChart tides={day.tides} date={day.date} />
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              <p>No forecast data available</p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
