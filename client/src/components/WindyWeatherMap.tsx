import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Play, MapPin, Wind, Waves, Thermometer } from "lucide-react";
import { Location } from "@/types/weather";

interface WindyWeatherMapProps {
  location: Location;
}

// Fixed wind overlay for focused wind data display
const WIND_OVERLAY = {
  id: "wind",
  name: "Wind",
  icon: Wind,
  description: "Live wind speed and direction patterns"
} as const;

export default function WindyWeatherMap({ location }: WindyWeatherMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wind className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Wind Forecast</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Windy
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Live Wind Patterns
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isExpanded ? (
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

            {/* Description and Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Live wind speed and direction patterns • Interactive wind forecast
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(false)}
                data-testid="button-collapse-windy"
              >
                Collapse
              </Button>
            </div>
          </div>
        ) : (
          // Collapsed state with preview and play button
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-3 text-center">
              <div className="flex items-center space-x-2">
                <Wind className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Interactive Wind Forecast</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center max-w-md">
              View live wind speed, direction, and patterns for {location.name} 
              on an interactive map powered by Windy.
            </p>
            
            <Button
              onClick={() => setIsExpanded(true)}
              size="lg"
              className="flex items-center space-x-2"
              data-testid="button-expand-windy"
            >
              <Play className="h-4 w-4" />
              <span>Open Wind Map</span>
            </Button>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Wind className="h-3 w-3" />
                <span>Wind speed</span>
              </div>
              <div className="flex items-center space-x-1">
                <Wind className="h-3 w-3" />
                <span>Wind direction</span>
              </div>
              <div className="flex items-center space-x-1">
                <Wind className="h-3 w-3" />
                <span>Wind patterns</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>Interactive map</span>
              </div>
            </div>
          </div>
        )}

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