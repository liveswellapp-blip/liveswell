import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, Wind, Navigation, Star } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface SurfSpot {
  id: number;
  name: string;
  city: string;
  country: string;
  region?: string;
  latitude: string;
  longitude: string;
  difficulty?: string;
  break_type?: string;
  optimal_swell?: string;
  optimal_wind?: string;
}

interface GroupedSpots {
  [continent: string]: {
    [country: string]: {
      [region: string]: SurfSpot[];
    };
  };
}

const CONTINENT_MAP: { [key: string]: string } = {
  "USA": "North America",
  "Mexico": "North America",
  "Costa Rica": "North America",
  "Australia": "Oceania",
  "Portugal": "Europe",
  "France": "Europe", 
  "Spain": "Europe",
  "Indonesia": "Asia",
  "Brazil": "South America",
  "Chile": "South America",
  "South Africa": "Africa",
  "Fiji": "Oceania"
};

const DIFFICULTY_COLORS = {
  "Beginner": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Intermediate": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Advanced": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "Expert": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function SurfSpots() {
  const [, setLocation] = useLocation();
  const [selectedContinent, setSelectedContinent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  const { data: spots, isLoading } = useQuery<SurfSpot[]>({
    queryKey: ["/api/locations/search", "all"],
    queryFn: async () => {
      const response = await fetch("/api/locations/all");
      if (!response.ok) throw new Error("Failed to fetch surf spots");
      return response.json();
    },
  });

  const groupedSpots = useMemo((): GroupedSpots => {
    if (!spots) return {};
    
    return spots.reduce((acc, spot) => {
      const continent = CONTINENT_MAP[spot.country] || "Other";
      const country = spot.country;
      const region = spot.region || "General";
      
      if (!acc[continent]) acc[continent] = {};
      if (!acc[continent][country]) acc[continent][country] = {};
      if (!acc[continent][country][region]) acc[continent][country][region] = [];
      
      acc[continent][country][region].push(spot);
      return acc;
    }, {} as GroupedSpots);
  }, [spots]);

  const filteredSpots = useMemo(() => {
    if (!spots) return [];
    
    return spots.filter(spot => {
      const continent = CONTINENT_MAP[spot.country] || "Other";
      const matchesContinent = !selectedContinent || continent === selectedContinent;
      const matchesCountry = !selectedCountry || spot.country === selectedCountry;
      const matchesRegion = !selectedRegion || spot.region === selectedRegion;
      
      return matchesContinent && matchesCountry && matchesRegion;
    });
  }, [spots, selectedContinent, selectedCountry, selectedRegion]);

  const continents = Object.keys(groupedSpots).sort();
  const countries = selectedContinent ? Object.keys(groupedSpots[selectedContinent] || {}).sort() : [];
  const regions = selectedContinent && selectedCountry 
    ? Object.keys(groupedSpots[selectedContinent]?.[selectedCountry] || {}).sort()
    : [];

  const handleSpotSelect = (spotId: number) => {
    setLocation(`/?location=${spotId}`);
  };

  const clearFilters = () => {
    setSelectedContinent("");
    setSelectedCountry("");
    setSelectedRegion("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-blue-900 dark:text-white">
                  Global Surf Spots
                </h1>
                <p className="text-muted-foreground mt-2">
                  Discover {spots?.length || 0} surf spots across {continents.length} continents with real-time conditions
                </p>
              </div>
              {(selectedContinent || selectedCountry || selectedRegion) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Hierarchical Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedContinent} onValueChange={(value) => {
                setSelectedContinent(value);
                setSelectedCountry("");
                setSelectedRegion("");
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select continent" />
                </SelectTrigger>
                <SelectContent>
                  {continents.map(continent => (
                    <SelectItem key={continent} value={continent}>
                      {continent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedContinent && (
                <Select value={selectedCountry} onValueChange={(value) => {
                  setSelectedCountry(value);
                  setSelectedRegion("");
                }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedCountry && regions.length > 1 && (
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Results Counter */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredSpots.length} surf spot{filteredSpots.length !== 1 ? 's' : ''}
              {selectedContinent || selectedCountry || selectedRegion ? (
                <span>
                  {selectedContinent && ` in ${selectedContinent}`}
                  {selectedCountry && ` • ${selectedCountry}`}
                  {selectedRegion && ` • ${selectedRegion}`}
                </span>
              ) : (
                " worldwide"
              )}
            </div>
          </div>

          {/* Surf Spots Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSpots.map((spot) => (
              <Card 
                key={spot.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow border-border"
                onClick={() => handleSpotSelect(spot.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-blue-900 dark:text-white">
                        {spot.name}
                      </CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {spot.city}, {spot.country}
                      </div>
                      {spot.region && (
                        <div className="text-xs text-muted-foreground">
                          {spot.region}
                        </div>
                      )}
                    </div>
                    {spot.difficulty && (
                      <Badge 
                        variant="secondary" 
                        className={DIFFICULTY_COLORS[spot.difficulty as keyof typeof DIFFICULTY_COLORS]}
                      >
                        {spot.difficulty}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {spot.break_type && (
                    <div className="flex items-center text-sm">
                      <Waves className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-muted-foreground">{spot.break_type}</span>
                    </div>
                  )}
                  
                  {spot.optimal_swell && (
                    <div className="flex items-center text-sm">
                      <Navigation className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-muted-foreground">
                        Best swell: {spot.optimal_swell}
                      </span>
                    </div>
                  )}
                  
                  {spot.optimal_wind && (
                    <div className="flex items-center text-sm">
                      <Wind className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                      <span className="text-muted-foreground">
                        Best wind: {spot.optimal_wind}
                      </span>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3 text-blue-900 dark:text-white border-blue-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-800"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    View Conditions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredSpots.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Waves className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-2">
                  No surf spots found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters to discover surf spots in other locations.
                </p>
                <Button onClick={clearFilters}>Clear All Filters</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}