import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, Droplets, Wind, Zap } from "lucide-react";
import { Location, SurfConditions, ForecastDay } from "@/types/weather";
import TideChart from "@/components/TideChart";
import FavoriteButton from "@/components/FavoriteButton";

interface CurrentConditionsProps {
  location: Location;
}

export default function CurrentConditions({ location }: CurrentConditionsProps) {
  const { data: conditions, isLoading, error } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
    
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Convert tide times to comparable format and find next one
    const futureTides = todayTides.filter(tide => {
      const tideDate = new Date();
      const [time, period] = tide.time.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      tideDate.setHours(hour24, parseInt(minutes), 0, 0);
      return tideDate > now;
    });
    
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

  if (error) {
    return (
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center text-red-600">
            <p>Unable to load current conditions. Please try again later.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Live Conditions</h1>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FavoriteButton 
              locationId={location.id} 
              locationName={location.name}
              size="sm"
            />
            <h2 className="text-xl font-semibold dark-slate">{location.name}</h2>
          </div>
          
        </div>
        
        {conditions?.warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{conditions.warning}</p>
          </div>
        )}
        


        {/* Current Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wave Conditions */}
          <div className="from-ocean-blue to-sky-blue rounded-lg p-4 bg-[#efefef] text-[#4087f1]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span className="font-medium">Wave Height</span>
              </div>
              <span className="text-sm opacity-75">Live</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold">{conditions?.waveHeight || "0"}</span>
                  <span className="text-lg mb-1">ft</span>
                </>
              )}
            </div>
            <div className="text-sm mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <div className="mb-1">
                    <span>Period: {conditions?.wavePeriod || 0}s</span>
                  </div>
                  <div>
                    <span>Direction: {conditions?.waveDirection || "N/A"}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Wind Conditions */}
          <div className="from-sunset-orange to-yellow-400 rounded-lg p-4 bg-[#efefef] text-[#6853a6]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wind className="h-5 w-5" />
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
                      <span className="text-3xl font-bold">{conditions?.windSpeed || "0"}</span>
                      <span className="text-lg mb-1">mph</span>
                    </>
                  )}
                </div>
                <div className="text-sm mt-2">
                  {isLoading ? (
                    <Skeleton className="h-4 w-32 bg-white/20" />
                  ) : (
                    <>
                      <div className="mb-1">
                        <span>Direction: {conditions?.windDirection || "N/A"}</span>
                      </div>
                      <div>
                        <span>Gusts: {conditions?.windGusts || "0"} mph</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tide Information */}
          <div className="from-sea-green to-sky-blue rounded-lg p-4 bg-[#efefef] text-[#004182]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5" />
                <span className="font-medium">Tide</span>
              </div>
              <span className="text-sm opacity-75">Current</span>
            </div>
            <div className="flex items-end space-x-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-white/20" />
              ) : (
                <>
                  <span className="text-3xl font-bold">{conditions?.tideHeight || "0"}</span>
                  <span className="text-lg mb-1">ft</span>
                </>
              )}
            </div>
            <div className="text-sm mt-2">
              {isLoading || forecastLoading ? (
                <Skeleton className="h-4 w-32 bg-white/20" />
              ) : (
                <>
                  <div className="mb-2">
                    {nextTide ? (
                      <span>
                        {nextTide.type === 'high' ? 'Rising' : 'Falling'}: {nextTide.type === 'high' ? 'High' : 'Low'} Tide at {nextTide.time}
                      </span>
                    ) : (
                      <span>No upcoming tides today</span>
                    )}
                  </div>
                  
                  {/* Today's Tide Chart */}
                  {todayTides.length > 0 && (
                    <TideChart tides={todayTides} date="today" />
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
