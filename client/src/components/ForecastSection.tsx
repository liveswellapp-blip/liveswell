import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Waves } from "lucide-react";
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
      <div className="w-full">
        <Card className="bg-card shadow-lg p-6 border border-border mx-4 md:mx-auto md:max-w-7xl rounded-none md:rounded-xl">
          <div className="text-center text-red-600">
            <p className="text-destructive">Unable to load forecast data. Please try again later.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="bg-card shadow-lg p-6 border border-border mx-4 md:mx-auto md:max-w-7xl rounded-none md:rounded-xl">
        <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">5-Day Surf Forecast</h3>
        
        {/* Forecast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {isLoading ? (
            // Loading skeletons
            (Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-4">
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
              <div key={index} className="rounded-lg p-4 hover:shadow-md transition-shadow bg-muted border border-border">
                <div className="text-left">
                  <div className="font-medium mb-2 text-[18px] text-blue-900 dark:text-white">
                    {day.date}
                  </div>
                  <div className="flex items-center space-x-2 font-semibold mb-1 text-[25px] text-blue-900 dark:text-white">
                    <Waves className="h-[25px] w-[25px] text-blue-900 dark:text-white" />
                    <span>{day.waveHeight}</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2 text-[18px] text-blue-900 dark:text-white">
                    <Wind className="h-[18px] w-[18px] text-blue-900 dark:text-white" />
                    <span>{day.wind}</span>
                  </div>
                </div>
                
                {/* Tide Chart */}
                {day.tides && day.tides.length > 0 && (
                  <TideChart tides={day.tides} date={day.date} location={location} />
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              <p>No forecast data available</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
