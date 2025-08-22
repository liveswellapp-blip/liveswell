import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wind, Waves, Clock } from "lucide-react";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useState } from "react";

interface ForecastSectionProps {
  location: Location;
}

interface DetailedForecastData {
  location: string;
  date: string;
  dayOffset: number;
  hourlyData: {
    time: string;
    hour: number;
    waveHeight: string;
    wavePeriod: string;
    waveDirection: string;
    windSpeed: string;
    windDirection: string;
  }[];
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: forecast = [], isLoading, error } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: detailedData, isLoading: detailedLoading } = useQuery<DetailedForecastData>({
    queryKey: [`/api/locations/${location.id}/detailed-forecast/${selectedDay}`],
    enabled: selectedDay !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const handleCardClick = (dayIndex: number) => {
    setSelectedDay(dayIndex + 1); // dayOffset starts from 1 (tomorrow)
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedDay(null);
  };

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
              <div 
                key={index}
                onClick={() => handleCardClick(index)}
                className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[300px] rounded-lg p-3 lg:p-4 hover:shadow-lg transition-all cursor-pointer bg-muted border border-border min-h-[140px] lg:min-h-[200px] flex flex-col snap-center hover:bg-muted/80 active:scale-[0.98]" 
                data-testid={`forecast-card-${index}`}
              >
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
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 lg:space-x-3 font-semibold text-[14px] lg:text-[16px] text-blue-900 dark:text-white">
                          <Waves className="h-[14px] w-[14px] lg:h-[16px] lg:w-[16px] text-blue-900 dark:text-white flex-shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                        </div>
                        <div className="text-[12px] lg:text-[13px] text-gray-600 dark:text-gray-400">
                          Period: {day.wavePeriod}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 lg:space-x-3 text-[14px] lg:text-[16px] text-blue-900 dark:text-white">
                          <Wind className="h-[14px] w-[14px] lg:h-[16px] lg:w-[16px] text-blue-900 dark:text-white flex-shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">{day.windSpeed}</span>
                        </div>
                        <div className="text-[12px] lg:text-[13px] text-gray-600 dark:text-gray-400">
                          Direction: {day.windDirection}
                        </div>
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
      
      {/* Detailed Forecast Modal */}
      <Dialog open={showDetailModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-900 dark:text-white">
              {detailedData?.date} Detailed Forecast - {detailedData?.location}
            </DialogTitle>
          </DialogHeader>
          
          {detailedLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : detailedData ? (
            <div className="space-y-0">
              {/* Header */}
              <div className="flex bg-emerald-50 dark:bg-emerald-900/20 rounded-t-lg font-semibold text-[11px] py-2 gap-2 pl-2.5">
                <div className="w-14">Time</div>
                <div className="w-16">Waves</div>
                <div className="w-16">Period</div>
                <div className="w-16">Wind</div>
                <div className="flex-1">Direction</div>
              </div>
              
              {/* Hourly Data */}
              <div className="max-h-96 overflow-y-auto bg-background rounded-b-lg">
                {detailedData.hourlyData.map((hour, index) => (
                  <div key={index}>
                    <div className="flex text-[11px] hover:bg-muted/30 transition-colors py-2 gap-2 pl-2.5">
                      <div className="w-14 font-medium text-gray-900 dark:text-gray-100">{hour.time}</div>
                      <div className="w-16 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {hour.waveHeight}
                        <div className="text-[8px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {hour.waveDirection}
                        </div>
                      </div>
                      <div className="w-16 text-blue-600 dark:text-blue-400 font-medium">
                        {hour.wavePeriod}
                      </div>
                      <div className="w-16 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {hour.windSpeed}
                      </div>
                      <div className="flex-1 text-blue-600 dark:text-blue-400 font-medium">
                        {hour.windDirection}
                      </div>
                    </div>
                    {index < detailedData.hourlyData.length - 1 && (
                      <div className="border-b border-emerald-200 dark:border-emerald-800 opacity-30"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No detailed data available for this day</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
