import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Waves, BarChart3, Wind, CloudSun, AlertCircle, ChevronDown, ChevronUp, Sun, Thermometer, Shield, Navigation, Clock, Activity, TrendingUp } from "lucide-react";
import { Location, SurfConditions, ForecastDay, HistoricalWaveData, FutureWindData } from "@/types/weather";
import TideChart from "@/components/TideChart";
import FavoriteButton from "@/components/FavoriteButton";
import AISurfSummary from "@/components/AISurfSummary";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface CurrentConditionsProps {
  location: Location;
}

// Convert wind direction to arrow rotation degrees
// Wind direction shows where wind is coming FROM, arrow shows where it's going TO
// Navigation icon points up-right by default, so we need to adjust
const getWindArrowRotation = (direction: string): number => {
  const directions: { [key: string]: number } = {
    'N': 0,     'NNE': 22.5,  'NE': 45,   'ENE': 67.5,
    'E': 90,    'ESE': 112.5, 'SE': 135,  'SSE': 157.5,
    'S': 180,   'SSW': 202.5, 'SW': 225,  'WSW': 247.5,
    'W': 270,   'WNW': 292.5, 'NW': 315,  'NNW': 337.5
  };
  const baseRotation = directions[direction.toUpperCase()] || 0;
  // Navigation icon points NE by default, so subtract 45° then add 180° to flip direction
  return (baseRotation - 45 + 180) % 360;
};

interface BuoyHistoricalData {
  stationId: string;
  historicalData: {
    time: string;
    hour: number;
    date: string;
    waveHeight: number;
    wavePeriod: number;
    waveDirection: string;
    stationId: string;
  }[];
  dataSource: 'noaa' | 'simulated';
}

interface WindForecastData {
  locationId: number;
  forecastData: {
    time: string;
    date: string;
    hour: number;
    windSpeed: number;
    windDirection: string;
    windGusts: number;
  }[];
  dataSource: 'openweather';
}

export default function CurrentConditions({ location }: CurrentConditionsProps) {
  const getLocalTime = () => {
    const getTimezone = (lat: number, lon: number) => {
      if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) return "America/Los_Angeles";
      if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) return "America/Denver";
      if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) return "America/Chicago";
      if (lon >= -88 && lon <= -66 && lat >= 25 && lat <= 47) return "America/New_York";
      return undefined;
    };
    const tz = getTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, ...(tz ? { timeZone: tz } : {}) });
  };

  const [localTime, setLocalTime] = useState(getLocalTime);
  useEffect(() => {
    const id = setInterval(() => setLocalTime(getLocalTime()), 30000);
    return () => clearInterval(id);
  }, [location.latitude, location.longitude]);

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isWindForecastExpanded, setIsWindForecastExpanded] = useState(false);
  const [selectedBuoyStation, setSelectedBuoyStation] = useState<string | null>(null);
  const [showBuoyHistoryModal, setShowBuoyHistoryModal] = useState(false);
  const [showWindDetailsModal, setShowWindDetailsModal] = useState(false);
  
  const { data: conditions, isLoading, error } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch buoy historical data when a buoy is selected
  const { data: buoyHistoryData, isLoading: buoyHistoryLoading } = useQuery<BuoyHistoricalData>({
    queryKey: [`/api/buoy/${selectedBuoyStation}/historical`],
    enabled: selectedBuoyStation !== null && showBuoyHistoryModal,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch 48-hour wind forecast data when modal is opened
  const { data: windDetailsData, isLoading: windDetailsLoading } = useQuery<WindForecastData>({
    queryKey: [`/api/locations/${location.id}/wind-details`],
    enabled: showWindDetailsModal,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Handler functions for buoy historical data modal
  const handleBuoyHistoryClick = (stationId: string, stationName: string) => {
    setSelectedBuoyStation(stationId);
    setShowBuoyHistoryModal(true);
  };

  const handleCloseBuoyModal = () => {
    setShowBuoyHistoryModal(false);
    setSelectedBuoyStation(null);
  };

  // Handler functions for wind details modal
  const handleWindDetailsClick = () => {
    setShowWindDetailsModal(true);
  };

  const handleCloseWindModal = () => {
    setShowWindDetailsModal(false);
  };

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
      <div className="container mx-auto px-4 md:px-6 pt-8 max-w-7xl">
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
      {/* Enhanced Location Header for Desktop */}
      <div className="container mx-auto px-4 md:px-6 pt-6 max-w-7xl">
        <div className="flex flex-col mb-4 space-y-2">
          <div className="flex items-center space-x-3">
            <FavoriteButton 
              locationId={location.id} 
              locationName={location.name}
              size="sm"
            />
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white">{location.name}</h1>
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
      <div className="container mx-auto px-4 md:px-6 mb-6 max-w-7xl">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-white mb-4">Live Conditions</h2>
        
        {/* AI Surf Summary - appears below Live Conditions heading */}
        <AISurfSummary location={location} />
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}
        


        {/* Enhanced Current Conditions Grid - Desktop: 3 cards in row, Tide below */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Expanded Wave Conditions Card */}
          <div className="col-span-2 lg:col-span-1 rounded-lg p-3 md:p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Waves className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-sm md:text-base font-medium">Swell</span>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-gray-300 dark:bg-gray-600 rounded" />
                  <Skeleton className="h-16 w-full bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Buoy Data - Side by Side Layout */}
                  {((conditions as any)?.primaryBuoy || (conditions as any)?.backupBuoy) && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Primary Buoy Data */}
                      {(conditions as any)?.primaryBuoy && (
                        <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-50/20 dark:bg-emerald-900/10 flex flex-col">
                          <div className="flex items-end space-x-2 mb-2">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {(conditions as any).primaryBuoy.waveHeight ? parseFloat((conditions as any).primaryBuoy.waveHeight).toFixed(1) : "0.0"}<span className="text-sm">ft</span> <span className="text-sm">@</span> {(conditions as any).primaryBuoy.wavePeriod || 0}<span className="text-sm">s</span>
                            </span>
                          </div>
                          <div className="space-y-1 text-xs mb-2">
                            <div>Direction: <span className="text-emerald-600 dark:text-emerald-400">{(conditions as any).primaryBuoy.waveDirection || "N/A"}</span></div>
                          </div>
                          <div className="leading-tight space-y-0 mb-2 flex-grow">
                            {(conditions as any).primaryBuoy.stationName ? (
                              <>
                                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  {(conditions as any).primaryBuoy.stationName}
                                </div>
                                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  Station {(conditions as any).primaryBuoy.stationId}
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                Buoy {(conditions as any).primaryBuoy.stationId}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-6 text-[10px] font-medium border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 mt-auto"
                            onClick={() => handleBuoyHistoryClick((conditions as any).primaryBuoy.stationId, (conditions as any).primaryBuoy.stationName)}
                            data-testid="primary-buoy-history-button"
                          >
                            Historical Data
                          </Button>
                        </div>
                      )}

                      {/* Backup Buoy Data */}
                      {(conditions as any)?.backupBuoy && (
                        <div className="border border-blue-300/30 rounded-lg p-3 bg-blue-50/20 dark:bg-blue-900/10 flex flex-col">
                          <div className="flex items-end space-x-2 mb-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {(conditions as any).backupBuoy.waveHeight ? parseFloat((conditions as any).backupBuoy.waveHeight).toFixed(1) : "0.0"}<span className="text-sm">ft</span> <span className="text-sm">@</span> {(conditions as any).backupBuoy.wavePeriod || 0}<span className="text-sm">s</span>
                            </span>
                          </div>
                          <div className="space-y-1 text-xs mb-2">
                            <div>Direction: <span className="text-blue-600 dark:text-blue-400">{(conditions as any).backupBuoy.waveDirection || "N/A"}</span></div>
                          </div>
                          <div className="leading-tight space-y-0 mb-2 flex-grow">
                            {(conditions as any).backupBuoy.stationName ? (
                              <>
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                  {(conditions as any).backupBuoy.stationName}
                                </div>
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                  Station {(conditions as any).backupBuoy.stationId}
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                Buoy {(conditions as any).backupBuoy.stationId}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-6 text-[10px] font-medium border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 mt-auto"
                            onClick={() => handleBuoyHistoryClick((conditions as any).backupBuoy.stationId, (conditions as any).backupBuoy.stationName)}
                            data-testid="backup-buoy-history-button"
                          >
                            Historical Data
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback single data display if no detailed buoy data */}
                  {!(conditions as any)?.primaryBuoy && (
                    <div>
                      <div className="flex items-end space-x-2 mb-2">
                        <span className="text-3xl font-bold text-blue-900 dark:text-emerald-400">
                          {conditions?.waveHeight ? parseFloat(conditions.waveHeight).toFixed(1) : "0.0"}
                        </span>
                        <span className="text-lg mb-1 text-blue-900 dark:text-emerald-400">ft</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>Period: <span className="text-blue-900 dark:text-emerald-400">{conditions?.wavePeriod || 0}s</span></div>
                        <div>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.waveDirection || "N/A"}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-2">
                    NOAA Buoy Network
                  </div>
                </div>
              )}
            </div>

          {/* Wind Conditions */}
          <div className="rounded-lg p-3 md:p-4 bg-muted text-blue-900 dark:text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Wind className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-sm md:text-base font-medium">Wind</span>
                </div>
              </div>
              
              <div className="flex items-end space-x-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                ) : (
                  <>
                    <span className="text-3xl md:text-3xl font-bold text-blue-900 dark:text-emerald-400">{conditions?.windSpeed ? Math.round(parseFloat(conditions.windSpeed)) : "0"}</span>
                    <span className="text-lg md:text-lg mb-1 text-blue-900 dark:text-emerald-400">mph</span>
                    {conditions?.windDirection && (
                      <Navigation 
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
              <div className="text-xs md:text-sm mt-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
                ) : (
                  <div>
                    <div className="mb-1">
                      <span>Gusts: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windGusts ? Math.round(parseFloat(conditions.windGusts)) : "0"} mph</span></span>
                    </div>
                    <div className="mb-2 flex items-center space-x-2">
                      <span>Direction: <span className="text-blue-900 dark:text-emerald-400">{conditions?.windDirection || "N/A"}</span></span>
                    </div>
                    
                    {/* View Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-6 text-[10px] font-medium border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 mb-2"
                      onClick={handleWindDetailsClick}
                      data-testid="wind-details-button"
                    >
                      Future Data
                    </Button>
                    
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-1">
                      OpenWeatherMap API
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Water Temperature */}
            <div className="rounded-lg p-3 md:p-4 bg-muted text-blue-900 dark:text-white border border-border flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-blue-900 dark:text-white" />
                  <span className="text-sm md:text-base font-medium">Water</span>
                </div>
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                ) : (
                  <div>
                    <div className="flex items-end space-x-2">
                      <span className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">{conditions?.waterTemp || "0"}</span>
                      <span className="text-base md:text-2xl mb-1 text-blue-600 dark:text-blue-400">°F</span>
                    </div>
                    <div className="flex items-end space-x-2 mb-2">
                      <span className="text-xl md:text-3xl text-blue-600 dark:text-blue-400">
                        {conditions?.waterTemp ? (((parseFloat(conditions.waterTemp) - 32) * 5/9)).toFixed(1) : "0.0"}
                      </span>
                      <span className="text-sm md:text-xl mb-0.5 text-blue-600 dark:text-blue-400">°C</span>
                    </div>
                    {(conditions as any)?.primaryBuoy && (
                      <div className="leading-tight space-y-0">
                        {(conditions as any).primaryBuoy.stationName ? (
                          <>
                            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                              {(conditions as any).primaryBuoy.stationName}
                            </div>
                            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                              Station {(conditions as any).primaryBuoy.stationId}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                            Buoy {(conditions as any).primaryBuoy.stationId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-1 mt-2">
                NOAA Sea Surface Temp
              </div>
            </div>

          {/* Tide & Sun - Horizontal Layout - Spans full width below */}
          <div className="col-span-2 lg:col-span-3 rounded-lg p-4 bg-muted text-blue-900 dark:text-white border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-900 dark:text-white" />
                <span className="text-base font-medium">Tide & Sun</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{localTime} local</span>
              </div>
            </div>
            
            {isLoading || forecastLoading ? (
              <Skeleton className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tide Chart */}
                {todayTides.length > 0 && (
                  <div className="lg:col-span-3">
                    <TideChart tides={todayTides} date="today" location={location} sunrise={conditions?.sunrise} sunset={conditions?.sunset} />
                  </div>
                )}
                
                {/* Tide Times Data */}
                {todayTides.length > 0 && (
                  <div className="lg:col-span-2 space-y-2">
                    {todayTides
                      .filter(tide => tide.type === 'high' || tide.type === 'low')
                      .sort((a, b) => {
                        const parseTime = (timeStr: string) => {
                          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                          if (!match) return 0;
                          
                          let hours = parseInt(match[1]);
                          const minutes = parseInt(match[2]);
                          const isPM = match[3].toUpperCase() === 'PM';
                          
                          if (isPM && hours !== 12) hours += 12;
                          if (!isPM && hours === 12) hours = 0;
                          
                          return hours * 60 + minutes;
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
                
                {/* Sun Data */}
                <div className="lg:col-span-1 space-y-2">
                  <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Sunrise</span>
                      {isLoading ? (
                        <Skeleton className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded" />
                      ) : (
                        <span className="text-sm font-semibold text-emerald-400">
                          {conditions?.sunrise || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Sunset</span>
                      {isLoading ? (
                        <Skeleton className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded" />
                      ) : (
                        <span className="text-sm font-semibold text-emerald-400">
                          {conditions?.sunset || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3 text-white" />
                        <span className="text-xs text-white">UV Index</span>
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded" />
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-semibold text-emerald-400">{conditions?.uvIndex || 0}</span>
                          <span className="text-xs text-emerald-400">
                            {conditions?.uvIndex && conditions.uvIndex > 7 ? "High" : 
                             conditions?.uvIndex && conditions.uvIndex > 5 ? "Med" : 
                             conditions?.uvIndex && conditions.uvIndex > 2 ? "Low" : "Min"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-1 mt-2">
                    NOAA Tides & Currents / OpenWeatherMap
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
        

      </div>
      {/* Buoy Historical Data Modal */}
      <Dialog open={showBuoyHistoryModal} onOpenChange={handleCloseBuoyModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-900 dark:text-white pr-8">
              {selectedBuoyStation && buoyHistoryData && (
                `24-Hour Buoy History - Station ${selectedBuoyStation} (${buoyHistoryData.dataSource === 'noaa' ? 'NOAA Data' : 'Simulated'})`
              )}
            </DialogTitle>
          </DialogHeader>
          
          {buoyHistoryLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : buoyHistoryData ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm sm:text-base md:text-lg">
                  <thead className="bg-emerald-50 dark:bg-emerald-900 sticky top-0 z-10">
                    <tr className="font-semibold">
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Time</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Height</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Period</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 bg-emerald-50 dark:bg-emerald-900">Direction</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background">
                    {buoyHistoryData.historicalData.map((dataPoint, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors border-b border-emerald-200 dark:border-emerald-800 last:border-b-0">
                        <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-600">
                          {dataPoint.time}
                        </td>
                        <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-emerald-600 dark:text-emerald-400 font-semibold border-r border-gray-300 dark:border-gray-600">
                          {dataPoint.waveHeight.toFixed(1)}ft
                        </td>
                        <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-blue-600 dark:text-blue-400 font-medium border-r border-gray-300 dark:border-gray-600">
                          {dataPoint.wavePeriod}s
                        </td>
                        <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-blue-600 dark:text-blue-400 font-medium">
                          {dataPoint.waveDirection}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No historical data available for this buoy</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Wind Details Modal */}
      <Dialog open={showWindDetailsModal} onOpenChange={handleCloseWindModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-900 dark:text-white pr-8">
              48-Hour Wind Forecast - {location.name}
            </DialogTitle>
          </DialogHeader>
          
          {windDetailsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : windDetailsData ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm sm:text-base md:text-lg">
                  <thead className="bg-emerald-50 dark:bg-emerald-900 sticky top-0 z-10">
                    <tr className="font-semibold">
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Date & Time</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Speed</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 border-r border-gray-300 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900">Gusts</th>
                      <th className="text-left py-2.5 sm:py-3 px-3 sm:px-4 bg-emerald-50 dark:bg-emerald-900">Direction</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background">
                    {windDetailsData.forecastData.map((dataPoint, index) => {
                      const showDate = index === 0 || dataPoint.date !== windDetailsData.forecastData[index - 1].date;
                      return (
                        <tr key={index} className="hover:bg-muted/30 transition-colors border-b border-emerald-200 dark:border-emerald-800 last:border-b-0">
                          <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-600">
                            {showDate && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                                {dataPoint.date}
                              </div>
                            )}
                            <div>{dataPoint.time}</div>
                          </td>
                          <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-emerald-600 dark:text-emerald-400 font-semibold border-r border-gray-300 dark:border-gray-600">
                            {dataPoint.windSpeed} mph
                          </td>
                          <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-blue-600 dark:text-blue-400 font-medium border-r border-gray-300 dark:border-gray-600">
                            {dataPoint.windGusts} mph
                          </td>
                          <td className="text-left py-2.5 sm:py-3 px-3 sm:px-4 text-blue-600 dark:text-blue-400 font-medium">
                            {dataPoint.windDirection}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No wind forecast data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
