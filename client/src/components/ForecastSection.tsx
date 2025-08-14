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
            // Enhanced Loading skeletons
            (Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-4 lg:p-6 min-h-[220px] lg:min-h-[280px] flex flex-col">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-20 border-b border-border/30 pb-2" />
                  <div className="space-y-2 lg:space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-6 w-6 lg:h-8 lg:w-8 rounded-full" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-5 w-5 lg:h-6 lg:w-6 rounded-full" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </div>
            )))
          ) : forecast.length > 0 ? (
            forecast.map((day, index) => (
              <div key={index} className="rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow bg-muted border border-border min-h-[220px] lg:min-h-[280px] flex flex-col">
                <div className="text-left h-full flex flex-col justify-between">
                  {/* Date Header */}
                  <div className="font-semibold mb-3 text-[18px] lg:text-[22px] text-blue-900 dark:text-white border-b border-border/30 pb-2">
                    {day.date}
                  </div>
                  
                  {/* Wave and Wind Data - Compact spacing */}
                  <div className="flex-1 space-y-2 lg:space-y-3">
                    <div className="flex items-center space-x-3 font-semibold text-[24px] lg:text-[30px] text-blue-900 dark:text-white">
                      <Waves className="h-[24px] w-[24px] lg:h-[30px] lg:w-[30px] text-blue-900 dark:text-white flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-[18px] lg:text-[22px] text-blue-900 dark:text-white">
                      <Wind className="h-[18px] w-[18px] lg:h-[22px] lg:w-[22px] text-blue-900 dark:text-white flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">{day.wind}</span>
                    </div>
                  </div>
                </div>
                
                  {/* Tide Chart - Compact positioning */}
                  <div className="mt-3 pt-2 border-t border-border/30">
                    {day.tides && day.tides.length > 0 && (
                      <TideChart tides={day.tides} date={day.date} location={location} />
                    )}
                  </div>
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
