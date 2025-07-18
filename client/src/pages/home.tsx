import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-black dark:to-emerald-900">
      <Header />
      <Navigation onLocationSelect={setCurrentLocation} />
      
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
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Welcome to SurfCast
            </h2>
            <p className="text-muted-foreground">
              Search for a coastal location or allow location access to get started
            </p>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
