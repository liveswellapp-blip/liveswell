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
      {/* Mobile/Tablet Layout */}
      <div className="xl:hidden">
        {/* Emerald separator line with spacing above */}
        <div className="w-full border-b border-emerald-500/30 mt-8 mb-4"></div>
        
        <div className="px-6 md:mx-auto md:max-w-7xl pb-4 mb-4">
          <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">5-Day Surf Forecast</h3>
        
        {/* Enhanced Forecast Cards for Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {isLoading ? (
            // Mobile optimized loading skeletons
            (Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-3 lg:p-6 min-h-[180px] lg:min-h-[280px] flex flex-col">
                <div className="space-y-2 lg:space-y-3">
                  <Skeleton className="h-5 lg:h-6 w-16 lg:w-20 border-b border-border/30 pb-1 lg:pb-2" />
                  <div className="space-y-1.5 lg:space-y-3">
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <Skeleton className="h-5 w-5 lg:h-8 lg:w-8 rounded-full" />
                      <Skeleton className="h-6 lg:h-8 w-12 lg:w-16" />
                    </div>
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <Skeleton className="h-4 w-4 lg:h-6 lg:w-6 rounded-full" />
                      <Skeleton className="h-5 lg:h-6 w-10 lg:w-12" />
                    </div>
                  </div>
                  <div className="mt-2 lg:mt-3 pt-1.5 lg:pt-2 border-t border-border/30">
                    <Skeleton className="h-12 lg:h-16 w-full" />
                  </div>
                </div>
              </div>
            )))
          ) : forecast.length > 0 ? (
            forecast.map((day, index) => (
              <div key={index} className="rounded-lg p-3 lg:p-6 hover:shadow-md transition-shadow bg-muted border border-border min-h-[180px] lg:min-h-[280px] flex flex-col">
                <div className="text-left h-full flex flex-col justify-between">
                  {/* Date Header */}
                  <div className="font-semibold mb-2 lg:mb-3 text-[16px] lg:text-[22px] text-blue-900 dark:text-white border-b border-border/30 pb-1 lg:pb-2">
                    {day.date}
                  </div>
                  
                  {/* Wave and Wind Data - Mobile optimized spacing */}
                  <div className="flex-1 space-y-1.5 lg:space-y-3">
                    <div className="flex items-center space-x-2 lg:space-x-3 font-semibold text-[20px] lg:text-[30px] text-blue-900 dark:text-white">
                      <Waves className="h-[20px] w-[20px] lg:h-[30px] lg:w-[30px] text-blue-900 dark:text-white flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 lg:space-x-3 text-[16px] lg:text-[22px] text-blue-900 dark:text-white">
                      <Wind className="h-[16px] w-[16px] lg:h-[22px] lg:w-[22px] text-blue-900 dark:text-white flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">{day.wind}</span>
                    </div>
                  </div>
                </div>
                
                  {/* Tide Chart - Mobile optimized positioning */}
                  <div className="mt-2 lg:mt-3 pt-1.5 lg:pt-2 border-t border-border/30">
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

      {/* Desktop Layout */}
      <div className="hidden xl:block">
        <div className="bg-muted rounded-lg border border-border p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-white">5-Day Surf Forecast</h3>
          
          {/* Desktop Forecast Cards - Full width grid */}
          <div className="grid grid-cols-5 gap-4">
            {isLoading ? (
              // Desktop Loading skeletons
              (Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-background rounded-lg border border-border p-3 min-h-[200px] flex flex-col">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-16 border-b border-border/30 pb-1" />
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-5 w-10" />
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-border/30">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
              )))
            ) : forecast.length > 0 ? (
              forecast.map((day, index) => (
                <div key={index} className="bg-background rounded-lg border border-border p-3 min-h-[200px] flex flex-col hover:shadow-md transition-shadow">
                  <div className="text-left h-full flex flex-col justify-between">
                    {/* Date Header */}
                    <div className="font-semibold mb-2 text-sm text-blue-900 dark:text-white border-b border-border/30 pb-1">
                      {day.date}
                    </div>
                    
                    {/* Wave and Wind Data - Compact */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center space-x-2 font-semibold text-lg text-blue-900 dark:text-white">
                        <Waves className="h-4 w-4 text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-blue-900 dark:text-white">
                        <Wind className="h-4 w-4 text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.wind}</span>
                      </div>
                    </div>
                    
                    {/* Tide Chart - Compact */}
                    <div className="mt-2 pt-1.5 border-t border-border/30">
                      {day.tides && day.tides.length > 0 && (
                        <TideChart tides={day.tides} date={day.date} location={location} />
                      )}
                    </div>
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
    </div>
  );
}
