import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Location } from "@/types/weather";

interface WindyWeatherMapProps {
  location: Location;
}

interface FutureWindData {
  date: string;
  dateLabel: string;
  windSpeed: string;
  windDirection: string;
  timestamp: string;
}

export default function WindyWeatherMap({ location }: WindyWeatherMapProps) {
  // Fetch future wind data for the table
  const { data: futureData, isLoading } = useQuery<FutureWindData[]>({
    queryKey: [`/api/locations/${location.id}/future-conditions`],
    enabled: !!location.id,
  });

  // Generate Windy embed URL with location coordinates for wind data
  const generateWindyUrl = () => {
    const params = new URLSearchParams({
      lat: location.latitude,
      lon: location.longitude,
      detailLat: location.latitude,
      detailLon: location.longitude,
      width: "650",
      height: "450",
      zoom: "10",
      level: "surface",
      overlay: "wind",
      product: "ecmwf", // European Centre for Medium-Range Weather Forecasts (most accurate)
      menu: "",
      message: "",
      marker: "true", // Show marker at surf spot location
      calendar: "now",
      pressure: "",
      type: "map",
      location: "coordinates",
      detail: "",
      metricWind: "kt", // Knots (standard for marine forecasting)
      metricTemp: "default",
      radarRange: "-1"
    });
    
    return `https://embed.windy.com/embed2.html?${params.toString()}`;
  };

  return (
    <Card className="w-full" data-testid="card-windy-weather-map">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Wind Forecast</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Interactive Windy Map */}
          <div className="relative">
            <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <iframe
                src={generateWindyUrl()}
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full h-full"
                title={`Windy wind forecast map for ${location.name}`}
                data-testid="iframe-windy-map"
              />
            </div>
          </div>
        </div>

        {/* Wind Forecast Table */}
        <div className="pt-4 border-t border-border mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Navigation className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-medium">Wind Forecast</span>
            </div>
            <span className="text-sm text-muted-foreground">Next 48 Hours</span>
          </div>

          {/* Wind Data Grid - Scrollable for 48 hours */}
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {isLoading ? (
              // Loading skeletons for first 8 hours
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-muted rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              ))
            ) : futureData ? (
              futureData.map((data, index) => {
                // Check if we need to show a date separator
                const showDateSeparator = index === 0 || 
                  (index > 0 && data.dateLabel !== futureData[index - 1].dateLabel);
                
                return (
                  <div key={index}>
                    {/* Date Separator */}
                    {showDateSeparator && (
                      <div className="flex items-center justify-center mb-3 mt-2">
                        <div className="flex-1 border-t border-border"></div>
                        <div className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {data.dateLabel}
                        </div>
                        <div className="flex-1 border-t border-border"></div>
                      </div>
                    )}
                    
                    {/* Wind Data Card */}
                    <div className="bg-muted rounded-lg p-3 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.date}</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {data.windSpeed} mph {data.windDirection}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No future wind data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Provider Attribution */}
        <div className="text-xs text-muted-foreground text-center pt-3 border-t border-border mt-3">
          Interactive wind data provided by{" "}
          <a 
            href="https://www.windy.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Windy.com
          </a>
          {" "}• ECMWF forecast model
        </div>
      </CardContent>
    </Card>
  );
}