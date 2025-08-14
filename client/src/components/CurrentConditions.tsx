import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, BarChart3, Wind, CloudSun, AlertCircle, ChevronDown, ChevronUp, Sun, Thermometer, Shield, ArrowUp } from "lucide-react";
import { Location, SurfConditions, ForecastDay, HistoricalWaveData, FutureWindData } from "@/types/weather";
import TideChart from "@/components/TideChart";
import FavoriteButton from "@/components/FavoriteButton";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CurrentConditionsProps {
  location: Location;
}

// Convert wind direction to arrow rotation degrees
const getWindArrowRotation = (direction: string): number => {
  const directions: { [key: string]: number } = {
    'N': 180,   'NNE': 202.5, 'NE': 225,  'ENE': 247.5,
    'E': 270,   'ESE': 292.5, 'SE': 315,  'SSE': 337.5,
    'S': 0,     'SSW': 22.5,  'SW': 45,   'WSW': 67.5,
    'W': 90,    'WNW': 112.5, 'NW': 135,  'NNW': 157.5
  };
  return directions[direction.toUpperCase()] || 0;
};

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
      <div className="container mx-auto px-4 pt-8">
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
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile/Tablet Header Layout */}
      <div className="xl:hidden">
        <div className="container mx-auto px-6 pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-2 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <FavoriteButton 
                locationId={location.id} 
                locationName={location.name}
                size="sm"
              />
              <h1 className="text-2xl lg:text-3xl font-bold text-blue-900 dark:text-white">{location.name}</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{location.city}</span>
              <span>•</span>
              <span>Last Updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>
        </div>
        {/* Thin emerald separator line */}
        <div className="w-full border-b border-emerald-500/30 mb-4"></div>
      </div>

      {/* Desktop Compact Header */}
      <div className="hidden xl:block px-4 mb-6 bg-blue-500/20">
        <div className="bg-muted rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FavoriteButton 
              locationId={location.id} 
              locationName={location.name}
              size="sm"
            />
            <h1 className="text-xl font-bold text-blue-900 dark:text-white">{location.name}</h1>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{location.city}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last Updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </div>
          </div>
        </div>
      </div>

      <div className="xl:hidden px-6 mb-4 md:mx-auto md:max-w-7xl">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-white mb-4">Live Conditions</h2>
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}
        

        {/* Mobile/Tablet Current Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Swell & Wind Side by Side */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 grid grid-cols-2 gap-4">
            {/* Wave Conditions */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Waves className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-base font-medium">Swell</span>
                </div>
              </div>
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <>
                    <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.waveHeight ? parseFloat(conditions.waveHeight).toFixed(1) : "0.0"}</span>
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
                    <div>
                      <span>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.waveDirection || "N/A"}</span></span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Wind Conditions */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Wind className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-base font-medium">Wind</span>
                </div>
              </div>
              
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <>
                    <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.windSpeed ? Math.round(parseFloat(conditions.windSpeed)) : "0"}</span>
                    <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">mph</span>
                    {conditions?.windDirection && (
                      <ArrowUp 
                        className="h-5 w-5 text-blue-900 dark:text-emerald-400 mb-1" 
                        style={{ 
                          transform: `rotate(${getWindArrowRotation(conditions.windDirection)}deg)`,
                          transition: 'transform 0.2s ease'
                        }}
                        data-testid="current-wind-arrow"
                      />
                    )}
                  </>
                )}
              </div>
              <div className="text-sm mt-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-32 bg-white/20" />
                ) : (
                  <div>
                    <div className="mb-1">
                      <span>Gusts: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windGusts ? Math.round(parseFloat(conditions.windGusts)) : "0"} mph</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windDirection || "N/A"}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tide Information */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="text-base font-medium">Tide</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {isLoading || forecastLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  {/* Today's Tide Chart */}
                  {todayTides.length > 0 && (
                    <TideChart tides={todayTides} date="today" location={location} />
                  )}
                  
                  {/* High/Low Tide Times and Heights - List View */}
                  {todayTides.length > 0 && (
                    <div className="space-y-2">
                      {todayTides
                        .filter(tide => tide.type === 'high' || tide.type === 'low')
                        .sort((a, b) => {
                          // Parse time strings to compare chronologically
                          const parseTime = (timeStr: string) => {
                            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                            if (!match) return 0;
                            
                            let hours = parseInt(match[1]);
                            const minutes = parseInt(match[2]);
                            const isPM = match[3].toUpperCase() === 'PM';
                            
                            if (isPM && hours !== 12) hours += 12;
                            if (!isPM && hours === 12) hours = 0;
                            
                            return hours * 60 + minutes; // Convert to minutes for easy comparison
                          };
                          
                          return parseTime(a.time) - parseTime(b.time);
                        })
                        .map((tide, index, sortedTides) => (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white capitalize">{tide.type} Tide</span>
                            <span className="text-emerald-400">{tide.time} - {tide.height.toFixed(1)} ft</span>
                          </div>
                          {index < sortedTides.length - 1 && (
                            <div className="border-t border-gray-600/30 mt-2"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sunrise & Sunset Information */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sun className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="text-base font-medium">Sun</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Sunrise */}
              <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Sunrise</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 bg-white/20" />
                  ) : (
                    <span className="text-lg font-semibold text-emerald-400">
                      {conditions?.sunrise || "N/A"}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Sunset */}
              <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Sunset</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 bg-white/20" />
                  ) : (
                    <span className="text-lg font-semibold text-emerald-400">
                      {conditions?.sunset || "N/A"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Water Temperature & UV Index Side by Side - Enhanced for Desktop */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 grid grid-cols-2 gap-4">
            {/* Water Temperature */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-base font-medium">Water</span>
                </div>
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <div>
                    <div className="flex items-end space-x-2">
                      <span className="text-2xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.waterTemp || "0"}</span>
                      <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">°F</span>
                    </div>
                    <div className="flex items-end space-x-2">
                      <span className="text-lg text-blue-900 dark:text-emerald-400">
                        {conditions?.waterTemp ? (((parseFloat(conditions.waterTemp) - 32) * 5/9)).toFixed(1) : "0.0"}
                      </span>
                      <span className="text-base mb-0.5 text-blue-900 dark:text-emerald-400">°C</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* UV Index */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-base font-medium">UV Index</span>
                </div>
              </div>
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <>
                    <span className="text-2xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.uvIndex || 0}</span>
                    <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">
                      {conditions?.uvIndex && conditions.uvIndex > 7 ? "High" : 
                       conditions?.uvIndex && conditions.uvIndex > 5 ? "Med" : 
                       conditions?.uvIndex && conditions.uvIndex > 2 ? "Low" : "Min"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Compact Layout */}
      <div className="hidden xl:block">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Live Conditions</h2>
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}

        {/* Desktop Compact Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-4">
          {/* Swell & Wind Combined */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            {/* Wave Conditions */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Waves className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="text-sm font-medium">Swell</span>
              </div>
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <>
                    <span className="text-2xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.waveHeight ? parseFloat(conditions.waveHeight).toFixed(1) : "0.0"}</span>
                    <span className="text-sm mb-1 text-blue-900 dark:text-emerald-400">ft</span>
                  </>
                )}
              </div>
              <div className="text-xs mt-1 space-y-1">
                {isLoading ? (
                  <Skeleton className="h-3 w-24 bg-white/20" />
                ) : (
                  <>
                    <div>Period: <span className="text-blue-900 dark:text-emerald-400">{conditions?.wavePeriod || 0}s</span></div>
                    <div>From: <span className="text-blue-900 dark:text-emerald-400">{conditions?.waveDirection || "N/A"}</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Wind Conditions */}
            <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Wind className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="text-sm font-medium">Wind</span>
              </div>
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <>
                    <span className="text-2xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.windSpeed ? Math.round(parseFloat(conditions.windSpeed)) : "0"}</span>
                    <span className="text-sm mb-1 text-blue-900 dark:text-emerald-400">mph</span>
                    {conditions?.windDirection && (
                      <ArrowUp 
                        className="h-4 w-4 text-blue-900 dark:text-emerald-400 mb-1" 
                        style={{ 
                          transform: `rotate(${getWindArrowRotation(conditions.windDirection)}deg)`,
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="text-xs mt-1 space-y-1">
                {isLoading ? (
                  <Skeleton className="h-3 w-24 bg-white/20" />
                ) : (
                  <>
                    <div>Gusts: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windGusts ? Math.round(parseFloat(conditions.windGusts)) : "0"} mph</span></div>
                    <div>From: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windDirection || "N/A"}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tide Information - Single Column */}
          <div className="rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-900 dark:text-white" />
              <span className="text-sm font-medium">Tide</span>
            </div>
            
            {isLoading || forecastLoading ? (
              <Skeleton className="h-16 w-full bg-white/20" />
            ) : (
              <>
                {/* Compact Tide Chart */}
                {todayTides.length > 0 && (
                  <div className="mb-2">
                    <TideChart tides={todayTides} date="today" location={location} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
