import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Waves, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useRef } from "react";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: forecast = [], isLoading, error } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 300; // Approximate card width with gap
      scrollContainerRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 300; // Approximate card width with gap
      scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  };

  if (error) {
    return (
      <div className="w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl border-b border-emerald-500/30 pb-4 mb-4">
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
      
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">5-Day Surf Forecast</h3>
        
        {/* Horizontal Scrolling Carousel */}
        <div className="relative">
          {/* Scroll indicator gradient - right side */}
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 rounded-r-lg" />
          
          <div 
            ref={scrollContainerRef}
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
              <div key={index} className="flex-shrink-0 w-[280px] sm:w-[320px] bg-muted rounded-lg p-3 min-h-[180px] flex flex-col snap-center">
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
              <div 
                key={index}
                className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-lg p-3 hover:shadow-md transition-shadow bg-muted border border-border min-h-[140px] flex flex-col snap-center" 
                data-testid={`forecast-card-${index}`}
              >
                {/* Main Content - Side by side layout */}
                <div className="flex-1 flex gap-3">
                  {/* Left side - Day name and wave/wind data */}
                  <div className="flex-[0.8] flex flex-col">
                    {/* Day name at top */}
                    <div className="font-semibold mb-2 text-[16px] text-blue-900 dark:text-white text-left">
                      {day.date}
                    </div>
                    
                    {/* Wave and Wind Data below */}
                    <div className="space-y-2 flex flex-col justify-center flex-1">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 font-semibold text-[14px] text-blue-900 dark:text-white">
                          <Waves className="h-[14px] w-[14px] text-blue-900 dark:text-white flex-shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                        </div>
                        <div className="text-[12px] text-gray-600 dark:text-gray-400">
                          Period: {day.wavePeriod}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-[14px] text-blue-900 dark:text-white">
                          <Wind className="h-[14px] w-[14px] text-blue-900 dark:text-white flex-shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">{day.windSpeed}</span>
                        </div>
                        <div className="text-[12px] text-gray-600 dark:text-gray-400">
                          Direction: {day.windDirection}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tide Chart - Right side */}
                  <div className="flex-[1.2] flex items-center">
                    {day.tides && day.tides.length > 0 && (
                      <div className="w-full">
                        <TideChart tides={day.tides} date={day.date} location={location} />
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            ))
          ) : (
            <div className="flex-shrink-0 w-[280px] sm:w-[320px] text-center text-muted-foreground flex items-center justify-center">
              <p>No forecast data available</p>
            </div>
          )}
          </div>
        </div>
        
        {/* Navigation Arrows */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={scrollLeft}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md"
            aria-label="Scroll left"
            data-testid="scroll-left-button"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={scrollRight}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md"
            aria-label="Scroll right"
            data-testid="scroll-right-button"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
      
    </div>
  );
}
