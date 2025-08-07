import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, ExternalLink, Play, Pause, Maximize2 } from "lucide-react";
import { Location } from "@/types/weather";

interface SurfCam {
  id: string;
  name: string;
  embedUrl: string;
  directUrl: string;
  provider: 'hdontap' | 'explore' | 'swellmagnet' | 'hbcams';
  isActive: boolean;
  quality: 'HD' | 'Standard';
  description?: string;
}

interface SurfCamProps {
  location: Location;
}

// Curated list of working public surf cams mapped to our surf spots
const SURF_CAM_DATABASE: Record<string, SurfCam[]> = {
  // California Spots - Using verified working cam sources
  "Malibu": [
    {
      id: "malibu-pier-hdontap",
      name: "Malibu Pier Live",
      embedUrl: "https://player.hdontap.com?c=204757",
      directUrl: "https://hdontap.com/stream/204757/malibu-pier-live-webcam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Live view of Malibu Pier and beach conditions"
    }
  ],
  
  "Malibu Point": [
    {
      id: "malibu-pier-hdontap",
      name: "Malibu Pier Live",
      embedUrl: "https://player.hdontap.com?c=204757",
      directUrl: "https://hdontap.com/stream/204757/malibu-pier-live-webcam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Live view of Malibu Pier and beach conditions"
    }
  ],
  
  "Huntington Beach": [
    {
      id: "hb-overview-hbcams", 
      name: "HB Overview",
      embedUrl: "https://cdn.pixelcaster.com/api/iframe/hb-innocean",
      directUrl: "https://hbcams.com/webcams-huntington-beach-overview",
      provider: "hbcams",
      isActive: true,
      quality: "HD",
      description: "Live overview of Huntington Beach"
    },
    {
      id: "hb-pier-south-hbcams", 
      name: "South of Pier",
      embedUrl: "https://cdn.pixelcaster.com/api/iframe/hb-pier-south",
      directUrl: "https://hbcams.com/webcams-huntington-beach-south-of-pier",
      provider: "hbcams",
      isActive: true,
      quality: "HD",
      description: "Live view south of Huntington Beach Pier"
    }
  ],
  
  "Huntington Pier": [
    {
      id: "hb-overview-hbcams", 
      name: "HB Overview",
      embedUrl: "https://cdn.pixelcaster.com/api/iframe/hb-innocean",
      directUrl: "https://hbcams.com/webcams-huntington-beach-overview",
      provider: "hbcams",
      isActive: true,
      quality: "HD",
      description: "Live overview of Huntington Beach"
    },
    {
      id: "hb-pier-south-hbcams", 
      name: "South of Pier",
      embedUrl: "https://cdn.pixelcaster.com/api/iframe/hb-pier-south",
      directUrl: "https://hbcams.com/webcams-huntington-beach-south-of-pier",
      provider: "hbcams",
      isActive: true,
      quality: "HD",
      description: "Live view south of Huntington Beach Pier"
    }
  ],
  
  "Manhattan Beach": [
    {
      id: "el-porto-roving-hdontap",
      name: "El Porto Roving",
      embedUrl: "https://player.hdontap.com?c=158254",
      directUrl: "https://hdontap.com/stream/158254/el-porto-beach-roving-live-cam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "El Porto Beach roving surf cam near Manhattan Beach"
    },
    {
      id: "manhattan-pier-hdontap",
      name: "Manhattan Pier",
      embedUrl: "https://player.hdontap.com?c=126730",
      directUrl: "https://hdontap.com/stream/126730/manhattan-beach-pier-ultra-hd-live-webcam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Manhattan Beach Pier Ultra HD webcam"
    }
  ],
  
  "Santa Monica": [
    {
      id: "venice-beach-hdontap",
      name: "Venice Beach",
      embedUrl: "https://hdontap.com/embed/venice-beach",
      directUrl: "https://swellmagnet.com/surf-cams/venice-boardwalk/",
      provider: "swellmagnet",
      isActive: true,
      quality: "HD", 
      description: "Venice Beach boardwalk and surf"
    }
  ],
  
  "Santa Cruz": [
    {
      id: "santa-cruz-hdontap",
      name: "Santa Cruz Cowell",
      embedUrl: "https://www.santacruzwaves.com/cowell-cam",
      directUrl: "https://www.santacruzwaves.com/cowell-cam",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Santa Cruz Cowell Beach surf cam"
    }
  ],
  
  // Hawaii Spots - Using verified working streams
  "Pipeline": [
    {
      id: "pipeline-explore-embed",
      name: "Pipeline North Shore", 
      embedUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam/embed",
      directUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam",
      provider: "explore",
      isActive: true,
      quality: "HD",
      description: "Live HD feed of Pipeline, North Shore Oahu"
    }
  ],
  
  "Haleiwa": [
    {
      id: "pipeline-explore-embed",
      name: "Pipeline North Shore", 
      embedUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam/embed",
      directUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam",
      provider: "explore",
      isActive: true,
      quality: "HD",
      description: "Live HD feed of Pipeline, North Shore Oahu"
    }
  ],
  
  "Waikiki": [
    {
      id: "waikiki-aquarium-cam",
      name: "Waikiki South Shore",
      embedUrl: "https://camstreamer.com/live/stream/18275",
      directUrl: "https://camstreamer.com/live/stream/18275-waikiki-aquarium-south-shore-surf-cam",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Waikiki Aquarium South Shore surf cam"
    }
  ],
  
  "Sunset Beach": [
    {
      id: "sunset-beach-explore",
      name: "Sunset Beach",
      embedUrl: "https://explore.org/livecams/hawaii/sunset-beach-cam",
      directUrl: "https://explore.org/livecams/hawaii/sunset-beach-cam", 
      provider: "explore",
      isActive: true,
      quality: "HD",
      description: "Sunset Beach North Shore cam"
    }
  ],
  
  // East Coast Florida Spots  
  "Cocoa Beach": [
    {
      id: "cocoa-beach-webcam",
      name: "Cocoa Beach Pier",
      embedUrl: "https://embed.windy.com/embed2.html?lat=28.336&lon=-80.606&detailLat=28.336&detailLon=-80.606&width=650&height=450&zoom=11&level=surface&overlay=webcams&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1",
      directUrl: "https://www.cocoabeach.com/surfcam/",
      provider: "hdontap",
      isActive: false,
      quality: "Standard",
      description: "Cocoa Beach area weather and surf view"
    }
  ],
  
  "New Smyrna Beach": [
    {
      id: "nsb-inlet-cam",
      name: "NSB Inlet",
      embedUrl: "https://www.nsbinlet.com/cam",
      directUrl: "https://www.nsbinlet.com/cam",
      provider: "hdontap", 
      isActive: true,
      quality: "Standard",
      description: "New Smyrna Beach Inlet surf cam"
    }
  ],

  // International spots with available cams
  "Jeffreys Bay": [
    {
      id: "jbay-webcam",
      name: "J-Bay Main Break",
      embedUrl: "https://www.jeffreysbaywindsurf.com/webcam.html",
      directUrl: "https://www.jeffreysbaywindsurf.com/webcam.html",
      provider: "hdontap",
      isActive: true,
      quality: "Standard",
      description: "Jeffreys Bay main surf break"
    }
  ]
};

export default function SurfCam({ location }: SurfCamProps) {
  const [selectedCam, setSelectedCam] = useState<SurfCam | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get available cams for this location using both name and city
  const getCamsForLocation = (loc: Location): SurfCam[] => {
    // Try exact name match first
    if (SURF_CAM_DATABASE[loc.name]) {
      return SURF_CAM_DATABASE[loc.name];
    }
    
    // Try city match
    if (SURF_CAM_DATABASE[loc.city]) {
      return SURF_CAM_DATABASE[loc.city];
    }
    
    // Try partial name matching for specific surf breaks
    for (const [key, cams] of Object.entries(SURF_CAM_DATABASE)) {
      if (loc.name.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(loc.name.toLowerCase())) {
        return cams;
      }
    }
    
    return [];
  };

  const availableCams = getCamsForLocation(location);

  // If no cams available, don't render the component
  if (availableCams.length === 0) {
    return null;
  }

  // Auto-select first active cam
  const defaultCam = selectedCam || availableCams.find(cam => cam.isActive) || availableCams[0];

  const handleCamSelect = (cam: SurfCam) => {
    setSelectedCam(cam);
    setIsPlaying(true);
  };

  const handleFullscreen = () => {
    if (defaultCam) {
      window.open(defaultCam.directUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto px-4">
      <Card className="bg-card rounded-xl shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-black dark:text-white">
            <Video className="h-5 w-5 text-emerald-500" />
            <span>Live Surf Cam</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({availableCams.length} view{availableCams.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Camera Selection */}
          {availableCams.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {availableCams.map((cam) => (
                <Button
                  key={cam.id}
                  variant={selectedCam?.id === cam.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCamSelect(cam)}
                  className="text-xs"
                  data-testid={`button-select-cam-${cam.id}`}
                >
                  {cam.name}
                  {cam.quality === 'HD' && (
                    <span className="ml-1 px-1 py-0.5 bg-emerald-500 text-white text-xs rounded">HD</span>
                  )}
                </Button>
              ))}
            </div>
          )}
          
          {/* Video Player */}
          <div className="relative">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {isPlaying ? (
                <iframe
                  src={defaultCam.embedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  className="w-full h-full"
                  data-testid="iframe-surf-cam"
                  onError={() => {
                    console.log("Surf cam failed to load:", defaultCam.embedUrl);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Button
                    onClick={() => setIsPlaying(true)}
                    size="lg"
                    className="flex items-center space-x-2"
                    data-testid="button-play-cam"
                  >
                    <Play className="h-6 w-6" />
                    <span>Watch Live Surf Cam</span>
                  </Button>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Click to view live HD surf conditions for {location.name}
                  </p>
                </div>
              )}
            </div>
            
            {/* Controls Overlay */}
            {isPlaying && (
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPlaying(false)}
                  className="opacity-80 hover:opacity-100"
                  data-testid="button-pause-cam"
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleFullscreen}
                  className="opacity-80 hover:opacity-100"
                  data-testid="button-fullscreen-cam"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Camera Info */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-foreground">{defaultCam.name}</p>
              {defaultCam.description && (
                <p className="text-muted-foreground">{defaultCam.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                {defaultCam.quality}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="text-xs"
                data-testid="button-external-link"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Full
              </Button>
            </div>
          </div>
          
          {/* Provider Attribution */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            Live stream provided by {defaultCam.provider === 'hdontap' ? 'HDOnTap' : 
              defaultCam.provider === 'explore' ? 'Explore.org' :
              defaultCam.provider === 'swellmagnet' ? 'SwellMagnet' : 
              defaultCam.provider === 'hbcams' ? 'HBcams' : defaultCam.provider}
            {!defaultCam.isActive && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                Currently Offline
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}