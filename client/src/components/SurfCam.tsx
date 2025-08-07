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

// Curated list of high-quality public surf cams mapped to our surf spots
const SURF_CAM_DATABASE: Record<string, SurfCam[]> = {
  // California Spots - Using both city names and spot names for better matching
  "Malibu": [
    {
      id: "malibu-point-hdontap",
      name: "Malibu Point Live",
      embedUrl: "https://hdontap.com/embed/842711",
      directUrl: "https://hdontap.com/stream/842711/malibu_surf_cam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Live view of Malibu Point surf break"
    }
  ],
  
  "Malibu Point": [
    {
      id: "malibu-point-hdontap",
      name: "Malibu Point Live",
      embedUrl: "https://hdontap.com/embed/842711",
      directUrl: "https://hdontap.com/stream/842711/malibu_surf_cam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Live view of Malibu Point surf break"
    }
  ],
  
  "Huntington Beach": [
    {
      id: "hb-pier-hdontap", 
      name: "Huntington Pier",
      embedUrl: "https://hdontap.com/embed/255678",
      directUrl: "https://hdontap.com/stream/255678/huntington-beach-pier-live-cam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Huntington Beach Pier surf conditions"
    }
  ],
  
  "Huntington Pier": [
    {
      id: "hb-pier-hdontap", 
      name: "Huntington Pier",
      embedUrl: "https://hdontap.com/embed/255678",
      directUrl: "https://hdontap.com/stream/255678/huntington-beach-pier-live-cam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "Huntington Beach Pier surf conditions"
    }
  ],
  
  "Manhattan Beach": [
    {
      id: "el-porto-hdontap",
      name: "El Porto",
      embedUrl: "https://hdontap.com/embed/256987", 
      directUrl: "https://hdontap.com/stream/256987/el-porto-manhattan-beach-live-webcam/",
      provider: "hdontap",
      isActive: true,
      quality: "HD",
      description: "El Porto surf spot near Manhattan Beach"
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
  
  // Hawaii Spots  
  "Pipeline": [
    {
      id: "pipeline-explore",
      name: "Pipeline North Shore", 
      embedUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam",
      directUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam",
      provider: "explore",
      isActive: true,
      quality: "HD",
      description: "Live HD feed of Pipeline, North Shore Oahu"
    }
  ],
  
  "Haleiwa": [
    {
      id: "pipeline-explore",
      name: "Pipeline North Shore", 
      embedUrl: "https://explore.org/livecams/hawaii/hawaii-pipeline-cam",
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
      id: "cocoa-beach-surfguru",
      name: "Cocoa Beach Pier",
      embedUrl: "https://www.cocoabeach.com/surfcam",
      directUrl: "https://www.cocoabeach.com/surfcam",
      provider: "hdontap",
      isActive: true,
      quality: "Standard",
      description: "Cocoa Beach Pier surf conditions"
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
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full"
                  data-testid="iframe-surf-cam"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Button
                    onClick={() => setIsPlaying(true)}
                    size="lg"
                    className="flex items-center space-x-2"
                    data-testid="button-play-cam"
                  >
                    <Play className="h-6 w-6" />
                    <span>Watch Live</span>
                  </Button>
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
              defaultCam.provider === 'swellmagnet' ? 'SwellMagnet' : 'HBcams'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}