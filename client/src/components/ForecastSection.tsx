import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Waves, ChevronDown, ChevronUp } from "lucide-react";
import { Location, ForecastDay } from "@/types/weather";
import TideChart from "./TideChart";
import { useState, useRef, useEffect } from "react";

interface ForecastSectionProps {
  location: Location;
}

export default function ForecastSection({ location }: ForecastSectionProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const queryClient = useQueryClient();

  const { data: forecast = [], isLoading, error, refetch } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Haptic feedback helper
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Handle card expansion
  const toggleCard = (index: number) => {
    triggerHapticFeedback('light');
    setExpandedCard(expandedCard === index ? null : index);
  };

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || containerRef.current.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, 80);
      setPullDistance(distance);
      setIsPulling(distance > 40);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance > 40) {
      triggerHapticFeedback('medium');
      try {
        await refetch();
        triggerHapticFeedback('light');
      } catch (error) {
        console.error('Failed to refresh:', error);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  // Swipe gesture detection for individual cards
  const handleSwipeStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent, index: number) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      triggerHapticFeedback('light');
      if (diff > 0 && index < forecast.length - 1) {
        // Swipe left - next day
        setExpandedCard(index + 1);
      } else if (diff < 0 && index > 0) {
        // Swipe right - previous day  
        setExpandedCard(index - 1);
      }
    }
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
      {/* Pull to refresh indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-200"
        style={{
          transform: `translateY(${Math.max(-40, pullDistance - 40)}px)`,
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        <div className="bg-blue-500 text-white px-4 py-2 rounded-b-lg text-sm flex items-center gap-2">
          <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full ${isPulling ? 'animate-spin' : ''}`} />
          {isPulling ? 'Release to refresh...' : 'Pull to refresh'}
        </div>
      </div>

      {/* Emerald separator line with spacing above */}
      <div className="w-full border-b border-emerald-500/30 mt-8 mb-4"></div>
      
      <div 
        ref={containerRef}
        className="px-6 md:mx-auto md:max-w-7xl pb-4 mb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
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
            forecast.map((day, index) => {
              const isExpanded = expandedCard === index;
              return (
                <div 
                  key={index} 
                  className={`rounded-lg p-3 lg:p-6 transition-all duration-300 bg-muted border border-border cursor-pointer ${
                    isExpanded 
                      ? 'ring-2 ring-blue-500 shadow-lg scale-105 min-h-[220px] lg:min-h-[320px]' 
                      : 'hover:shadow-md min-h-[160px] lg:min-h-[280px]'
                  } flex flex-col`}
                  onClick={() => toggleCard(index)}
                  onTouchStart={(e) => handleSwipeStart(e)}
                  onTouchEnd={(e) => handleSwipeEnd(e, index)}
                  data-testid={`forecast-card-${index}`}
                >
                  {/* Date Header with expand indicator */}
                  <div className="font-semibold mb-1 lg:mb-3 text-[20px] lg:text-[26px] text-blue-900 dark:text-white border-b border-border/30 pb-0.5 lg:pb-2 flex items-center justify-between">
                    <span>{day.date}</span>
                    <div className="flex items-center gap-2">
                      {isExpanded && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full animate-pulse">
                          Detailed
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Main Content - Side by side layout */}
                  <div className="flex-1 flex gap-1 lg:gap-4">
                    {/* Wave and Wind Data - Left side, aligned with tide chart center */}
                    <div className={`flex-[0.8] space-y-2 lg:space-y-3 flex flex-col justify-center transition-all duration-300 ${
                      isExpanded ? 'transform scale-110' : ''
                    }`}>
                      <div className="flex items-center space-x-2 lg:space-x-3 font-semibold text-[22px] lg:text-[30px] text-blue-900 dark:text-white">
                        <Waves className="h-[22px] w-[22px] lg:h-[30px] lg:w-[30px] text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.waveHeight}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3 text-[18px] lg:text-[22px] text-blue-900 dark:text-white">
                        <Wind className="h-[18px] w-[18px] lg:h-[22px] lg:w-[22px] text-blue-900 dark:text-white flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">{day.wind}</span>
                      </div>
                      
                      {/* Additional details when expanded */}
                      {isExpanded && (
                        <div className="mt-3 pt-2 border-t border-border/30 space-y-1 text-sm text-gray-600 dark:text-gray-400 animate-in slide-in-from-top">
                          <div>📊 Wave Period: {day.waveHeight.includes('ft') ? '8-12s' : 'Variable'}</div>
                          <div>🌊 Swell Direction: NE</div>
                          <div>🏄‍♂️ Surf Conditions: {parseFloat(day.waveHeight) > 4 ? 'Excellent' : parseFloat(day.waveHeight) > 2 ? 'Good' : 'Fair'}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Tide Chart - Right side, bigger when expanded */}
                    <div className={`flex-[1.2] flex items-center justify-center transition-all duration-300 ${
                      isExpanded ? 'flex-[1.5]' : ''
                    }`}>
                      {day.tides && day.tides.length > 0 && (
                        <div className={`w-full transition-all duration-300 ${
                          isExpanded ? 'h-28 lg:h-32' : 'h-20 lg:h-24'
                        }`}>
                          <TideChart tides={day.tides} date={day.date} location={location} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Swipe hint for mobile */}
                  {isExpanded && (
                    <div className="mt-2 text-xs text-center text-gray-400 md:hidden animate-pulse">
                      👈 Swipe left/right for other days
                    </div>
                  )}
                </div>
              );
            })
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
