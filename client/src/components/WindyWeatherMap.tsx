import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "@/types/weather";

interface WindyWeatherMapProps {
  location: Location;
}

export default function WindyWeatherMap({ location }: WindyWeatherMapProps) {

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