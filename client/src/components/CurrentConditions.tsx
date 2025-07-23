import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, BarChart3, Navigation, CloudSun, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Location, SurfConditions, ForecastDay, HistoricalWaveData, FutureWindData } from "@/types/weather";
import TideChart from "@/components/TideChart";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CurrentConditionsProps {
  location: Location;
}

export default function CurrentConditions({ location }: CurrentConditionsProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isWindForecastExpanded, setIsWindForecastExpanded] = useState(false);
  
  const { data: conditions, isLoading, error } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch historical wave data when expanded
  const { data: historicalData, isLoading: historyLoading } = useQuery<HistoricalWaveData[]>({
    queryKey: [`/api/locations/${location.id}/history`],
    enabled: isHistoryExpanded,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Fetch future wind data when expanded
  const { data: windForecastData, isLoading: windForecastLoading } = useQuery<FutureWindData[]>({
    queryKey: [`/api/locations/${location.id}/wind-forecast`],
    enabled: isWindForecastExpanded,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });

  // Fetch forecast data to get today's tide information
  const { data: forecast, isLoading: forecastLoading } = useQuery<ForecastDay[]>({
    queryKey: [`/api/locations/${location.id}/forecast`],
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });

  // Get today's tide data
  const todayTides = forecast?.[0]?.tides || [];

  // Function to find the next upcoming tide
  const getNextTide = () => {
    if (!todayTides.length) return null;
    
    // Get timezone for location
    const getLocationTimezone = (lat: number, lon: number): string => {
      // Pacific Time Zone (West Coast)
      if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) {
        return 'America/Los_Angeles';
      }
      // Mountain Time Zone
      if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) {
        return 'America/Denver';
      }
      // Central Time Zone
      if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) {
        return 'America/Chicago';
      }
      // Eastern Time Zone (East Coast and Gulf)
      if (lon >= -88 && lon <= -66 && lat >= 25 && lat <= 47) {
        return 'America/New_York';
      }
      return 'UTC';
    };
    
    const timezone = getLocationTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    const now = new Date();
    
    // Get current time in location's timezone
    const nowInLocationTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Convert tide times to comparable format and find next one
    const tidesWithDates = todayTides.map(tide => {
      const [time, period] = tide.time.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      // Create date in location's timezone (use today's date)
      const tideDate = new Date(nowInLocationTz.getFullYear(), nowInLocationTz.getMonth(), nowInLocationTz.getDate(), hour24, parseInt(minutes));
      
      return {
        ...tide,
        dateTime: tideDate,
        debugInfo: {
          originalTime: tide.time,
          hour24: hour24,
          minutes: parseInt(minutes),
          tideDateTime: tideDate.toString(),
          currentTime: nowInLocationTz.toString()
        }
      };
    });
    
    // Sort by time and find the next upcoming tide
    const futureTides = tidesWithDates
      .filter(tide => tide.dateTime > nowInLocationTz)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    

    
    return futureTides.length > 0 ? futureTides[0] : null;
  };

  const nextTide = getNextTide();

  // Debug logging
  console.log('CurrentConditions Debug:', {
    location: location.id,
    isLoading,
    error: error?.message,
    conditions,
    waveHeight: conditions?.waveHeight,
    tideHeight: conditions?.tideHeight,
    windSpeed: conditions?.windSpeed
  });

  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date();
    const lastUpdated = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const getCurrentLocalTime = () => {
    // Get timezone for location
    const getLocationTimezone = (lat: number, lon: number): string => {
      // Pacific Time Zone (West Coast)
      if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) {
        return 'America/Los_Angeles';
      }
      // Mountain Time Zone
      if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) {
        return 'America/Denver';
      }
      // Central Time Zone
      if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) {
        return 'America/Chicago';
      }
      // Eastern Time Zone (East Coast and Gulf)
      if (lon >= -88 && lon <= -66 && lat >= 25 && lat <= 47) {
        return 'America/New_York';
      }
      return 'UTC';
    };
    
    const timezone = getLocationTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });
  };

  if (error) {
    return (
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-card rounded-xl shadow-lg p-6 mb-6 border border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-blue-900 dark:text-white">
              <div className="flex items-center space-x-2">
                <CloudSun className="h-6 w-6 text-blue-900 dark:text-emerald-400" />
                <span>Current Conditions</span>
              </div>

            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Weather Data Temporarily Unavailable</h3>
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                External weather service is experiencing connectivity issues
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  ✅ Real-time NOAA wave monitoring data is still available below
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Check the NOAA Buoy Data section for live wave conditions and marine weather
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="bg-card rounded-xl shadow-lg p-6 mb-6 border border-border">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-white mb-4">Live Conditions</h1>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-white">{location.name}</h2>
          </div>
          
        </div>
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}
        


        {/* Current Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wave Conditions with Expandable History */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Waves className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="font-medium">Wave Height</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.waveHeight || "0"}</span>
                  <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">ft</span>
                </>
              )}
            </div>
            <div className="text-sm mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <div className="mb-1">
                    <span>Period: <span className="text-blue-900 dark:text-emerald-400">{conditions?.wavePeriod || 0}s</span></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.waveDirection || "N/A"}</span></span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm opacity-75">Past</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="h-5 w-5 p-0 hover:bg-blue-100 dark:hover:bg-gray-700"
                      >
                        {isHistoryExpanded ? (
                          <ChevronUp className="h-3 w-3 text-blue-600 dark:text-emerald-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-blue-600 dark:text-emerald-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Expandable Historical Data */}
            {isHistoryExpanded && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-3 text-white">Past 12 Hours</h4>
                {historyLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full bg-white/20" />
                    ))}
                  </div>
                ) : historicalData && historicalData.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto pr-2">
                    <div className="space-y-1">
                      {historicalData.map((data, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center text-sm py-1">
                            <span className="opacity-75">{data.time}</span>
                            <span className="font-medium text-blue-900 dark:text-emerald-400">
                              {data.waveHeight} ft
                            </span>
                          </div>
                          {index < historicalData.length - 1 && (
                            <div className="border-b border-gray-300 dark:border-gray-600"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs opacity-75">No historical data available</p>
                )}
              </div>
            )}
          </div>

          {/* Wind Conditions */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Navigation className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="font-medium">Wind</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-end space-x-2">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 bg-white/20" />
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.windSpeed || "0"}</span>
                      <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">mph</span>
                    </>
                  )}
                </div>
                <div className="text-sm mt-2 flex justify-between items-end">
                  {isLoading ? (
                    <Skeleton className="h-4 w-32 bg-white/20" />
                  ) : (
                    <div>
                      <div className="mb-1">
                        <span>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windDirection || "N/A"}</span></span>
                      </div>
                      <div>
                        <span>Gusts: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windGusts || "0"} mph</span></span>
                      </div>
                    </div>
                  )}
                  
                  {/* Future Wind Forecast Toggle - Aligned with Gust data */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsWindForecastExpanded(!isWindForecastExpanded)}
                    className="flex items-center space-x-1 hover:bg-white/10 p-1 h-auto"
                  >
                    <span className="text-sm opacity-75">Future</span>
                    {isWindForecastExpanded ? (
                      <ChevronUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-emerald-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Expandable Future Wind Data */}
            {isWindForecastExpanded && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-3 text-white">Next 48 Hours</h4>
                {windForecastLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full bg-white/20" />
                    ))}
                  </div>
                ) : windForecastData && windForecastData.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto pr-2">
                    <div className="space-y-1">
                      {windForecastData.map((data, index) => {
                        const currentDate = new Date(data.timestamp);
                        const prevDate = index > 0 ? new Date(windForecastData[index - 1].timestamp) : null;
                        const showDateHeader = index === 0 || !prevDate || currentDate.toDateString() !== prevDate.toDateString();
                        const today = new Date();
                        const isToday = currentDate.toDateString() === today.toDateString();
                        
                        return (
                          <div key={index}>
                            {showDateHeader && !isToday && (
                              <div className="mt-6 mb-2">
                                <h5 className="text-xs font-medium text-white opacity-90 uppercase tracking-wide">
                                  {currentDate.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </h5>
                                <div className="border-b border-gray-300 dark:border-gray-600 mt-1"></div>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-sm py-1">
                              <span className="opacity-75">{data.time}</span>
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-blue-900 dark:text-emerald-400">
                                  {data.windSpeed} mph
                                </span>
                                <span className="text-xs text-blue-900 dark:text-emerald-400">
                                  {data.windDirection}
                                </span>
                              </div>
                            </div>
                            {index < windForecastData.length - 1 && (
                              <div className="border-b border-gray-300 dark:border-gray-600"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs opacity-75">No forecast data available</p>
                )}
              </div>
            )}
          </div>

          {/* Tide Information */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="font-medium">Tide</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.tideHeight || "0"}</span>
                  <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">ft</span>
                </>
              )}
            </div>
            
            {/* Local Time */}
            <div className="text-sm mt-2 mb-2">
              <span className="text-blue-900 dark:text-white">Local Time: <span className="text-blue-900 dark:text-emerald-400">{getCurrentLocalTime()}</span></span>
            </div>
            
            <div className="text-sm">
              {isLoading || forecastLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  {/* Tide information above chart */}
                  <div className="mb-2">
                    {nextTide ? (
                      <span>
                        <span className="text-white">Upcoming: </span><span className="text-emerald-400">{nextTide.type === 'high' ? 'High' : 'Low'} Tide</span><span className="text-white"> </span><span className="text-blue-900 dark:text-emerald-400">{nextTide.time}</span>
                      </span>
                    ) : (
                      <span>No upcoming tides today</span>
                    )}
                  </div>
                  
                  {/* Today's Tide Chart */}
                  {todayTides.length > 0 && (
                    <TideChart tides={todayTides} date="today" location={location} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
