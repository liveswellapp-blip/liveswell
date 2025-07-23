import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Waves, Wind, Thermometer, Eye, Home, ArrowLeft } from 'lucide-react';
import type { Location } from '@/types/weather';

interface MapProps {}

interface LocationWithConditions extends Location {
  waveHeight?: string;
  windSpeed?: string;
  waterTemp?: string;
  lastUpdated?: string;
}

export default function Map({}: MapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationWithConditions | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch all locations for the map
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/locations'],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation denied or unavailable:', error);
        }
      );
    }
  }, []);

  // Fetch conditions for selected location
  const { data: conditions } = useQuery({
    queryKey: ['/api/locations', selectedLocation?.id, 'conditions'],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${selectedLocation?.id}/conditions`);
      return response.json();
    },
    enabled: !!selectedLocation?.id
  });

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sort locations by distance from user if available
  const sortedLocations = userLocation && locations
    ? [...locations].sort((a: Location, b: Location) => {
        const distA = calculateDistance(
          userLocation.lat, userLocation.lng,
          parseFloat(a.latitude), parseFloat(a.longitude)
        );
        const distB = calculateDistance(
          userLocation.lat, userLocation.lng,
          parseFloat(b.latitude), parseFloat(b.longitude)
        );
        return distA - distB;
      })
    : (locations || []);

  // Filter locations based on search
  const filteredLocations = (sortedLocations || []).filter((location: Location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-blue-900 dark:text-emerald-400 hover:text-blue-700 dark:hover:text-emerald-300 p-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 dark:text-emerald-400 mb-2">
            Interactive Surf Spot Map
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Discover surf spots near you with real-time conditions from NOAA monitoring stations
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search for surf spots, cities, or regions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map Placeholder */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Interactive Surf Spot Map
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-300 dark:border-gray-500">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 text-blue-400 dark:text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Interactive Map Component
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Select a location from the list to view it on the map
                    </p>
                    {userLocation && (
                      <Badge variant="secondary" className="mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        Your location detected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location List & Details */}
          <div className="space-y-4">
            {/* Selected Location Details */}
            {selectedLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedLocation.name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedLocation.city}, {selectedLocation.country}
                  </p>
                </CardHeader>
                <CardContent>
                  {conditions ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Waves className="h-4 w-4 text-coral-400" />
                        <span className="font-medium">Waves:</span>
                        <span className="text-coral-400 dark:text-coral-300">
                          {conditions.waveHeight} ft
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-purple-400" />
                        <span className="font-medium">Wind:</span>
                        <span className="text-purple-400 dark:text-purple-300">
                          {conditions.windSpeed} mph {conditions.windDirection}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-blue-400" />
                        <span className="font-medium">Water:</span>
                        <span className="text-blue-400 dark:text-blue-300">
                          {conditions.waterTemp}°F
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-purple-400" />
                        <span className="font-medium">Visibility:</span>
                        <span className="text-purple-400 dark:text-purple-300">
                          {conditions.visibility} mi
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Last updated: {new Date(conditions.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">
                      Loading conditions...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Location List */}
            <Card className="max-h-[500px] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-lg">
                  Surf Spots ({filteredLocations.length})
                </CardTitle>
                {userLocation && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sorted by distance from your location
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {locationsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading surf spots...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLocations.map((location: Location) => {
                      const distance = userLocation 
                        ? calculateDistance(
                            userLocation.lat, userLocation.lng,
                            parseFloat(location.latitude), parseFloat(location.longitude)
                          )
                        : null;
                      
                      return (
                        <Button
                          key={location.id}
                          variant={selectedLocation?.id === location.id ? "default" : "outline"}
                          className="w-full justify-start h-auto p-3"
                          onClick={() => handleLocationSelect(location)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{location.name}</div>
                            <div className="text-sm opacity-70">
                              {location.city}, {location.country}
                            </div>
                            {distance && (
                              <div className="text-xs opacity-60 mt-1">
                                {distance.toFixed(1)} miles away
                              </div>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-emerald-400">
                {locations.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Surf Spots
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-emerald-400">
                55
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                NOAA Buoy Stations
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-emerald-400">
                12
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Countries Covered
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-emerald-400">
                24/7
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Real-Time Updates
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}