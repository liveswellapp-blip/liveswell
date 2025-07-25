import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, Wind, Thermometer, Gauge } from "lucide-react";

interface NOAABuoyData {
  stationId: string;
  timestamp: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  airTemp: number | null;
  waterTemp: number | null;
  pressure: number | null;
}

interface NOAABuoyDataProps {
  stationId: string;
  stationName?: string;
}

export default function NOAABuoyData({ stationId, stationName }: NOAABuoyDataProps) {
  const { data: buoyData, isLoading, error } = useQuery<NOAABuoyData>({
    queryKey: [`/api/buoy/${stationId}`],
    staleTime: 15 * 60 * 1000, // 15 minutes (NOAA updates hourly)
    retry: 2,
  });

  if (error) {
    return (
      <Card className="bg-card rounded-xl shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Waves className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>NOAA Buoy Data</span>
            <Badge variant="destructive" className="text-xs">Offline</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Real-time buoy data temporarily unavailable
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Waves className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>NOAA Buoy Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!buoyData) return null;

  const formatWindDirection = (degrees: number | null): string => {
    if (!degrees) return "N/A";
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const convertToFahrenheit = (celsius: number | null): string => {
    if (celsius === null) return "N/A";
    return `${Math.round(celsius * 9/5 + 32)}°F`;
  };

  const convertWaveHeight = (meters: number | null): string => {
    if (meters === null) return "N/A";
    const feet = meters * 3.28084;
    return `${feet.toFixed(1)} ft`;
  };

  const convertWindSpeed = (mps: number | null): string => {
    if (mps === null) return "N/A";
    const mph = mps * 2.237;
    return `${Math.round(mph)} mph`;
  };

  const timeAgo = new Date(buoyData.timestamp).toLocaleTimeString();

  return (
    <Card className="bg-card rounded-xl shadow-lg border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-900 dark:text-white">
          <div className="flex items-center space-x-2">
            <Waves className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>NOAA Buoy {stationId}</span>
            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/20 text-xs">
              Live Data
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated: {timeAgo}
          </div>
        </CardTitle>
        {stationName && (
          <p className="text-sm text-blue-900 dark:text-emerald-400">{stationName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wave Conditions */}
        {(buoyData.waveHeight || buoyData.wavePeriod) && (
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-white flex items-center space-x-2">
              <Waves className="h-4 w-4" />
              <span>Wave Conditions</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Swell</div>
                <div className="text-lg font-semibold text-coral-500 dark:text-coral-400">
                  {convertWaveHeight(buoyData.waveHeight)}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Period</div>
                <div className="text-lg font-semibold text-purple-500 dark:text-purple-400">
                  {buoyData.wavePeriod ? `${buoyData.wavePeriod}s` : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Environmental Data */}
        <div className="space-y-2">
          <h4 className="font-semibold text-blue-900 dark:text-white flex items-center space-x-2">
            <Thermometer className="h-4 w-4" />
            <span>Environmental</span>
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Wind</div>
              <div className="text-lg font-semibold text-purple-500 dark:text-purple-400">
                {convertWindSpeed(buoyData.windSpeed)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatWindDirection(buoyData.windDirection)}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Water Temp</div>
              <div className="text-lg font-semibold text-gold-500 dark:text-gold-400">
                {convertToFahrenheit(buoyData.waterTemp)}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Data */}
        {(buoyData.airTemp || buoyData.pressure) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Air Temp</div>
              <div className="text-lg font-semibold text-coral-500 dark:text-coral-400">
                {convertToFahrenheit(buoyData.airTemp)}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Pressure</div>
              <div className="text-lg font-semibold text-emerald-500 dark:text-emerald-400">
                {buoyData.pressure ? `${buoyData.pressure.toFixed(1)} hPa` : "N/A"}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          Data provided by NOAA National Data Buoy Center (NDBC)
        </div>
      </CardContent>
    </Card>
  );
}