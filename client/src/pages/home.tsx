import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import CurrentConditions from "@/components/CurrentConditions";
import ForecastSection from "@/components/ForecastSection";
import DetailedData from "@/components/DetailedData";
import NearbySpots from "@/components/NearbySpots";
import SurfSpotStats from "@/components/SurfSpotStats";
import NOAABuoyData from "@/components/NOAABuoyData";
import Footer from "@/components/Footer";
import { Location } from "@/types/weather";

// Mapping of surf spots to nearby NOAA buoy stations
const BUOY_MAPPING: Record<string, { id: string; name: string }> = {
  "Malibu": { id: "46025", name: "Santa Monica Bay" },
  "Manhattan Beach": { id: "46025", name: "Santa Monica Bay" },
  "Huntington Beach": { id: "46025", name: "Santa Monica Bay" },
  "Newport Beach": { id: "46025", name: "Santa Monica Bay" },
  "La Jolla": { id: "46086", name: "San Clemente Island" },
  "Ocean Beach": { id: "46086", name: "San Clemente Island" },
  "Jacksonville Beach": { id: "41112", name: "Fernandina Beach" },
  "Cocoa Beach": { id: "41009", name: "Canaveral East" },
  "Daytona Beach": { id: "41012", name: "St. Augustine" },
  "Virginia Beach": { id: "44014", name: "Virginia Beach" },
  "Outer Banks": { id: "44014", name: "Virginia Beach" },
  "Montauk": { id: "44017", name: "Montauk Point" },
  "Rockaway Beach": { id: "44025", name: "Long Island" },
  "Ocean City": { id: "44009", name: "Delaware Bay" },
  "Myrtle Beach": { id: "41004", name: "Edisto" },
  "Half Moon Bay": { id: "46012", name: "Half Moon Bay" },
  "Santa Cruz": { id: "46042", name: "Monterey Bay" },
  "Carmel": { id: "46042", name: "Monterey Bay" },
  "Pismo Beach": { id: "46011", name: "Santa Maria" },
  "Rincon": { id: "46054", name: "Santa Barbara" },
  "Trestles": { id: "46086", name: "San Clemente Island" },
  "Pipeline": { id: "51001", name: "Northwest Hawaii" },
  "Waikiki": { id: "51001", name: "Northwest Hawaii" },
  "Sunset Beach": { id: "51001", name: "Northwest Hawaii" },
  "Maverick": { id: "46012", name: "Half Moon Bay" },
};

function getNearbyBuoyStation(location: Location | null): { id: string; name: string } | null {
  if (!location) return null;
  
  // Check by location name
  const locationKey = Object.keys(BUOY_MAPPING).find(key => 
    location.name.toLowerCase().includes(key.toLowerCase()) ||
    location.city?.toLowerCase().includes(key.toLowerCase())
  );
  
  return locationKey ? BUOY_MAPPING[locationKey] : null;
}

export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [location] = useLocation();

  // Get location name from URL parameters
  const getLocationNameFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('location');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/locations/nearby?lat=${latitude}&lng=${longitude}`);
          if (response.ok) {
            const location = await response.json();
            setCurrentLocation(location);
          }
        } catch (error) {
          console.error("Error fetching nearby location:", error);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoadingLocation(false);
      }
    );
  };

  // Load location based on URL parameter or default
  useEffect(() => {
    const loadLocation = async () => {
      const locationName = getLocationNameFromUrl();
      
      if (locationName) {
        // Load specific location by name
        try {
          const response = await fetch(`/api/locations/search?q=${encodeURIComponent(locationName)}`);
          if (response.ok) {
            const locations = await response.json();
            if (locations.length > 0) {
              setCurrentLocation(locations[0]);
              return;
            }
          }
        } catch (error) {
          console.error("Error loading location by name:", error);
        }
      }
      
      // Fallback to default location
      try {
        const response = await fetch("/api/locations/search?q=Malibu");
        if (response.ok) {
          const locations = await response.json();
          if (locations.length > 0) {
            setCurrentLocation(locations[0]);
          }
        }
      } catch (error) {
        console.error("Error loading default location:", error);
      }
    };

    loadLocation();
  }, [location, window.location.search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-900 dark:from-black dark:to-emerald-900">
      <Header />
      <Navigation onLocationSelect={setCurrentLocation} />
      
      {currentLocation ? (
        <>
          <CurrentConditions location={currentLocation} />
          <ForecastSection location={currentLocation} />
          <DetailedData location={currentLocation} />
          {getNearbyBuoyStation(currentLocation) && (
            <NOAABuoyData 
              stationId={getNearbyBuoyStation(currentLocation)!.id} 
              stationName={getNearbyBuoyStation(currentLocation)!.name}
            />
          )}
          <NearbySpots location={currentLocation} />
        </>
      ) : (
        <div className="container mx-auto px-4 py-12 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-blue-900 dark:text-white mb-4">
              Welcome to SurfCast
            </h2>
            <p className="text-blue-900 dark:text-emerald-400 mb-8">
              Search for a coastal location or allow location access to get started
            </p>
          </div>
          <SurfSpotStats />
        </div>
      )}
      
      <Footer />
    </div>
  );
}
