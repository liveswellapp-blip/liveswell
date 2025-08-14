import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CurrentConditions from "@/components/CurrentConditions";


import ForecastSection from "@/components/ForecastSection";
import DetailedData from "@/components/DetailedData";
import NearbySpots from "@/components/NearbySpots";
import SurfSpotStats from "@/components/SurfSpotStats";
import LoadingScreen from "@/components/LoadingScreen";

import Footer from "@/components/Footer";
import { Location } from "@/types/weather";



export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true); // Start as true
  const [isNavigating, setIsNavigating] = useState(false);
  const [location] = useLocation();
  const [urlParams, setUrlParams] = useState(new URLSearchParams(window.location.search));

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

  // Monitor URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const newParams = new URLSearchParams(window.location.search);
      setUrlParams(newParams);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Load location based on URL parameter or default
  useEffect(() => {
    const loadLocation = async () => {
      const locationParam = urlParams.get('location');
      
      console.log('Loading location from URL:', locationParam, 'Current location:', currentLocation?.name);
      
      // Start loading state when navigating
      if (locationParam && currentLocation) {
        const locationId = parseInt(locationParam);
        if (!isNaN(locationId) && currentLocation.id !== locationId) {
          setIsNavigating(true);
          // Scroll to top for better UX
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      
      if (locationParam) {
        // Check if it's a numeric ID
        const locationId = parseInt(locationParam);
        if (!isNaN(locationId)) {
          // Skip if we already have this location loaded
          if (currentLocation && currentLocation.id === locationId) {
            console.log('Location already loaded:', currentLocation.name);
            setIsLoadingLocation(false);
            setIsNavigating(false);
            return;
          }
          
          // Load specific location by ID
          try {
            const response = await fetch(`/api/locations/all`);
            if (response.ok) {
              const locations = await response.json();
              const location = locations.find((loc: Location) => loc.id === locationId);
              if (location) {
                console.log('Found location by ID:', location.name);
                setCurrentLocation(location);
                setIsLoadingLocation(false);
                setIsNavigating(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error loading location by ID:", error);
            setIsLoadingLocation(false);
            setIsNavigating(false);
          }
        } else {
          // Load specific location by name (fallback for old URLs)
          try {
            const response = await fetch(`/api/locations/search?q=${encodeURIComponent(locationParam)}`);
            if (response.ok) {
              const locations = await response.json();
              if (locations.length > 0) {
                console.log('Found location by name:', locations[0].name);
                setCurrentLocation(locations[0]);
                setIsLoadingLocation(false);
                setIsNavigating(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error loading location by name:", error);
            setIsLoadingLocation(false);
            setIsNavigating(false);
          }
        }
      }
      
      // Fallback to default location only if no current location
      if (!currentLocation) {
        try {
          const response = await fetch("/api/locations/search?q=Malibu");
          if (response.ok) {
            const locations = await response.json();
            if (locations.length > 0) {
              console.log('Loading default location:', locations[0].name);
              setCurrentLocation(locations[0]);
              setIsLoadingLocation(false);
            }
          }
        } catch (error) {
          console.error("Error loading default location:", error);
          setIsLoadingLocation(false);
        }
      }
    };

    loadLocation();
  }, [location, urlParams]);

  // Show full loading screen when initially loading or navigating
  if (isLoadingLocation || isNavigating) {
    return (
      <div className="min-h-screen bg-black">
        <Header onLocationSelect={setCurrentLocation} />
        <LoadingScreen type="conditions" />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header onLocationSelect={setCurrentLocation} />
      
      {currentLocation ? (
        <div className="space-y-4">
          <CurrentConditions location={currentLocation} />
          <ForecastSection location={currentLocation} />
          <DetailedData location={currentLocation} />
          <NearbySpots location={currentLocation} />
        </div>
      ) : (
        <div className="container mx-auto px-4 py-12 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-blue-900 dark:text-white mb-4">
              Welcome to LiveSwell
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
