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
        <div className="px-6 md:mx-auto md:max-w-7xl border-b border-emerald-500/30 pb-4 mb-4">
          <div className="text-center text-red-600">
            <p className="text-destructive">Unable to load forecast data. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Emerald separator line with spacing above */}
      <div className="w-full border-b border-emerald-500/30 mt-8 mb-4"></div>
      
      <div className="px-6 md:mx-auto md:max-w-7xl pb-4 mb-4">
        <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">5-Day Surf Forecast</h3>
        
        {/* Enhanced Forecast Cards for Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
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
              <div key={index} className="rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow bg-muted border border-border min-h-[200px] lg:min-h-[240px]">
                <div className="text-left h-full flex flex-col">
                  <div className="font-medium mb-3 text-[18px] lg:text-[20px] text-blue-900 dark:text-white">
                    {day.date}
                  </div>
                  <div className="flex items-center justify-between mb-4 flex-1">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2 font-semibold text-[25px] lg:text-[28px] text-blue-900 dark:text-white">
                        <Waves className="h-[25px] w-[25px] lg:h-[28px] lg:w-[28px] text-blue-900 dark:text-white" />
                        <span>{day.waveHeight}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[18px] lg:text-[20px] text-blue-900 dark:text-white">
                        <Wind className="h-[18px] w-[18px] lg:h-[20px] lg:w-[20px] text-blue-900 dark:text-white" />
                        <span>{day.wind}</span>
                      </div>
                    </div>
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
      </div>
    </div>
  );
}
