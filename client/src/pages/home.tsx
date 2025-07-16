import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import CurrentConditions from "@/components/CurrentConditions";
import ForecastSection from "@/components/ForecastSection";
import DetailedData from "@/components/DetailedData";
import NearbySpots from "@/components/NearbySpots";
import Footer from "@/components/Footer";
import { Location } from "@/types/weather";

export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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

  // Load default location on mount
  useEffect(() => {
    const loadDefaultLocation = async () => {
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

    loadDefaultLocation();
  }, []);

  return (
    <div className="min-h-screen bg-alice-blue">
      <Header 
        onLocationSelect={setCurrentLocation}
        onGetCurrentLocation={getCurrentLocation}
        isLoadingLocation={isLoadingLocation}
      />
      
      {currentLocation ? (
        <>
          <CurrentConditions location={currentLocation} />
          <ForecastSection location={currentLocation} />
          <DetailedData location={currentLocation} />
          <NearbySpots location={currentLocation} />
        </>
      ) : (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-semibold dark-slate mb-4">
              Welcome to SurfCast
            </h2>
            <p className="text-gray-600">
              Search for a coastal location or allow location access to get started
            </p>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
