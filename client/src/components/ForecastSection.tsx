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
        
        {/* Horizontal Scrolling Carousel */}
        <div className="relative">
          {/* Scroll indicator gradient - right side */}
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 rounded-r-lg" />
          
          <div 
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
          {isLoading ? (
            // Mobile optimized loading skeletons
            (Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[300px] bg-muted rounded-lg p-3 lg:p-6 min-h-[180px] lg:min-h-[280px] flex flex-col snap-center">
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
              <div key={index} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[300px] rounded-lg p-3 lg:p-4 hover:shadow-md transition-shadow bg-muted border border-border min-h-[140px] lg:min-h-[200px] flex flex-col snap-center" data-testid={`forecast-card-${index}`}>
                {/* Main Content - Side by side layout */}
                <div className="flex-1 flex gap-3 lg:gap-4">
                  {/* Left side - Day name and wave/wind data */}
                  <div className="flex-[0.8] flex flex-col">
                    {/* Day name at top */}
                    <div className="font-semibold mb-2 text-[16px] lg:text-[18px] text-blue-900 dark:text-white text-left">
                      {day.date}
                    </div>
                    
                    {/* Wave and Wind Data below */}
                    <div className="space-y-2 lg:space-y-3 flex flex-col justify-center flex-1">
                      <div className="flex items-center space-x-2 lg:space-x-3 font-semibold text-[18px] lg:text-[22px] text-blue-900 dark:text-white">
                        <Waves className="h-[18px] w-[18px] lg:h-[22px] lg:w-[22px] text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3 text-[14px] lg:text-[16px] text-blue-900 dark:text-white">
                        <Wind className="h-[14px] w-[14px] lg:h-[16px] lg:w-[16px] text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.wind}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tide Chart - Right side */}
                  <div className="flex-[1.2] flex items-center">
                    {day.tides && day.tides.length > 0 && (
                      <div className="w-full h-20 lg:h-24">
                        <TideChart tides={day.tides} date={day.date} location={location} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[300px] text-center text-muted-foreground flex items-center justify-center">
              <p>No forecast data available</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
