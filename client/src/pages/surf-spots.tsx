import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Waves, Wind, Navigation, Star, Heart, Search } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FavoriteButton from "@/components/FavoriteButton";
import { Location } from "@/types/weather";

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
      [state: string]: SurfSpot[];
    };
  };
}

const CONTINENT_MAP: { [key: string]: string } = {
  "USA": "North America",
  "Canada": "North America",
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

// Map USA cities to their states based on geographic location
const USA_CITY_TO_STATE: { [key: string]: string } = {
  // California - Comprehensive Coverage
  "Half Moon Bay": "California",
  "Santa Cruz": "California", 
  "Carpinteria": "California",
  "San Clemente": "California",
  "Malibu": "California",
  "Manhattan Beach": "California",
  "Huntington Beach": "California",
  "Encinitas": "California",
  "La Jolla": "California",
  "San Francisco": "California",
  "Oakland": "California",
  "Monterey": "California",
  "Big Sur": "California",
  "Laguna Beach": "California",
  "San Diego": "California",
  "Carlsbad": "California",
  "Pacifica": "California",
  "Capitola": "California",
  "Carmel": "California",
  "Pismo Beach": "California",
  "Lompoc": "California",
  "Goleta": "California",
  "Ventura": "California",
  "Los Angeles": "California",
  "El Segundo": "California",
  "Hermosa Beach": "California",
  "Redondo Beach": "California",
  "Palos Verdes": "California",
  "Dana Point": "California",
  "Newport Beach": "California",
  "Seal Beach": "California",
  "Pescadero": "California",
  "Davenport": "California",
  "Aptos": "California",
  "Moss Landing": "California",
  "Pacific Grove": "California",
  "Crescent City": "California",
  "Eureka": "California",
  
  // Hawaii
  "Haleiwa": "Hawaii",
  "Honolulu": "Hawaii",
  
  // Florida - Enhanced Coverage
  "Cocoa Beach": "Florida",
  "New Smyrna Beach": "Florida",
  "Jacksonville": "Florida",
  "Sebastian": "Florida",
  "Miami": "Florida",
  "Vero Beach": "Florida",
  "Pensacola": "Florida",
  "Destin": "Florida",
  "Panama City Beach": "Florida",
  "St. Augustine": "Florida",
  "Flagler Beach": "Florida",
  "Ormond Beach": "Florida",
  "Daytona Beach": "Florida",
  "Ponce Inlet": "Florida",
  "Melbourne Beach": "Florida",
  "Indialantic": "Florida",
  "Satellite Beach": "Florida",
  
  // Oregon - Pacific Northwest
  "Cannon Beach": "Oregon",
  "Manzanita": "Oregon",
  "Seaside": "Oregon",
  "Oswald West": "Oregon",
  "Lincoln City": "Oregon",
  "Pacific City": "Oregon",
  "Otter Rock": "Oregon",
  
  // Washington - Pacific Northwest
  "La Push": "Washington",
  "Westport": "Washington",
  "Neah Bay": "Washington",
  
  // New England - Maine & New Hampshire
  "Hampton": "New Hampshire",
  "Rye": "New Hampshire",
  "York": "Maine",
  "Wells": "Maine",
  "Kennebunkport": "Maine",
  
  // Mid-Atlantic - New York, New Jersey, Rhode Island
  "Montauk": "New York",
  "New York City": "New York",
  "Babylon": "New York",
  "Long Beach": "New York",
  "Manasquan": "New Jersey",
  "Asbury Park": "New Jersey",
  "Spring Lake": "New Jersey",
  "Belmar": "New Jersey",
  "Narragansett": "Rhode Island",
  "Newport": "Rhode Island",
  "Block Island": "Rhode Island",
  
  // Southeast - Virginia through Georgia
  "Virginia Beach": "Virginia",
  "Cape Hatteras": "North Carolina",
  "Kill Devil Hills": "North Carolina",
  "Nags Head": "North Carolina",
  "Wrightsville Beach": "North Carolina",
  "Buxton": "North Carolina",
  "Rehoboth Beach": "Delaware",
  "Charleston": "South Carolina",
  "Savannah": "Georgia",
  
  // Gulf Coast - Alabama
  "Gulf Shores": "Alabama",
  "Orange Beach": "Alabama",
  
  // Great Lakes - Wisconsin, Michigan, Pennsylvania, Ohio
  "Sheboygan": "Wisconsin",
  "Grand Haven": "Michigan",
  "Empire": "Michigan",
  "Erie": "Pennsylvania",
  "Bay Village": "Ohio",
  
  // Texas - Gulf Coast Expansion
  "Galveston": "Texas",
  "Surfside Beach": "Texas",
  "Freeport": "Texas",
  "South Padre Island": "Texas",
  
  // Massachusetts  
  "Nantucket": "Massachusetts",
  "Oak Bluffs": "Massachusetts",
  "Orleans": "Massachusetts",
  
  // Connecticut
  "Westport Beach": "Connecticut",
  "Fairfield": "Connecticut",
  
  // Louisiana
  "Grand Isle": "Louisiana",
  
  // Oregon - Additional
  "Bandon": "Oregon",
  "Gold Beach": "Oregon",
  
  // Georgia
  "Tybee Island": "Georgia",
  "Jekyll Island": "Georgia",
  
  // South Carolina
  "Myrtle Beach": "South Carolina",
  "Folly Beach": "South Carolina",
  
  // NEW STATES - Major Coastal Expansion
  
  // Virginia - Major East Coast
  "Chincoteague": "Virginia",
  
  // Maryland - Mid-Atlantic
  "Ocean City": "Maryland",
  "Berlin": "Maryland",
  
  // Delaware - Small State Big Surf
  "Bethany Beach": "Delaware",
  
  // North Carolina - Additional Outer Banks
  "Duck": "North Carolina",
  
  // Alabama - Gulf Coast
  "Dauphin Island": "Alabama",
  
  // Mississippi - Gulf Coast
  "Ocean Springs": "Mississippi",
  "Biloxi": "Mississippi",
  
  // Alaska - Remote Surfing
  "Yakutat": "Alaska",
  "Sitka": "Alaska",
  
  // California - Additional Central Coast
  "Cayucos": "California",
  "Avila Beach": "California",
  "Cambria": "California",
  
  // Washington - Additional Pacific Coast
  "Ocean Shores": "Washington"
};

// Map Canadian cities to their provinces
const CANADA_CITY_TO_STATE: { [key: string]: string } = {
  "Tofino": "British Columbia",
  "Ucluelet": "British Columbia", 
  "Halifax": "Nova Scotia",
  "Ingonish": "Nova Scotia"
};

// Map US Territory cities to their territories
const US_TERRITORY_CITY_TO_STATE: { [key: string]: string } = {
  // Puerto Rico - Caribbean Surf Capital
  "Rincon": "Puerto Rico",
  "Aguadilla": "Puerto Rico", 
  "Isabela": "Puerto Rico",
  "Dorado": "Puerto Rico",
  
  // US Virgin Islands - Pristine Caribbean
  "Charlotte Amalie": "US Virgin Islands",
  "Red Hook": "US Virgin Islands",
  "Frederiksted": "US Virgin Islands",
  
  // Guam - Remote Pacific
  "Talofofo": "Guam",
  "Dededo": "Guam",
  
  // American Samoa - Polynesian Surf
  "Pago Pago": "American Samoa",
  
  // Remote Maine - Additional
  "Phippsburg": "Maine",
  "Biddeford": "Maine",
  "Old Orchard Beach": "Maine",
  "Georgetown": "Maine",
  
  // Remote California - Northern Coast
  "Shelter Cove": "California",
  "Mendocino": "California",
  "Fort Bragg": "California",
  
  // Florida Keys - Remote Islands
  "Key Largo": "Florida",
  "Islamorada": "Florida",
  "Marathon": "Florida",
  "Key West": "Florida",
  
  // Michigan - Great Lakes Remote
  "Ludington": "Michigan",
  "Grand Marais": "Michigan",
  "Marquette": "Michigan",
  
  // Texas - Remote Gulf Coast
  "Port Aransas": "Texas",
  "Matagorda": "Texas",
  
  // Oregon - Remote Pacific Northwest
  "Brookings": "Oregon"
};

// Map Mexican cities to their states
const MEXICO_CITY_TO_STATE: { [key: string]: string } = {
  "Ensenada": "Baja California",
  "Rosarito": "Baja California",
  "Todos Santos": "Baja California Sur",
  "San Juanico": "Baja California Sur",
  "Puerto Vallarta": "Jalisco"
};

const DIFFICULTY_COLORS = {
  "Beginner": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Intermediate": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Advanced": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "Expert": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};



function SavedSpotsCard() {
  const [, setLocation] = useLocation();
  const { data: favorites, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
    refetchInterval: 30000,
  });

  const handleLocationSelect = (location: Location) => {
    setLocation(`/conditions?location=${location.id}`);
    // Scroll to top when navigating to the detail page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <Card className="bg-muted dark:bg-black">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved Spots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <Card className="bg-muted dark:bg-black">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved Spots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No saved spots yet</p>
            <p className="text-xs text-muted-foreground">
              Save spots to quickly access their wave conditions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show up to 3 favorites with a "View All" option
  const displayFavorites = favorites.slice(0, 3);

  return (
    <Card className="bg-muted dark:bg-black">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-900 dark:text-white">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Saved Spots</span>
          </div>
          {favorites.length > 3 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/favorites'}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View All ({favorites.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayFavorites.map((location) => (
            <div
              key={location.id}
              className="flex items-center space-x-3 p-3 rounded-lg border bg-white dark:bg-muted hover:bg-gray-50 dark:hover:bg-muted/80 transition-colors cursor-pointer"
              onClick={() => handleLocationSelect(location)}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-muted dark:bg-muted/50 rounded-full flex items-center justify-center">
                <Waves className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-blue-900 dark:text-white truncate text-sm">{location.name}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {location.city}, {location.country}
                </p>
              </div>
              <div className="flex-shrink-0">
                <FavoriteButton
                  locationId={location.id}
                  locationName={location.name}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SurfSpots() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContinent, setSelectedContinent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");

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
      
      // Use appropriate state/province mapping based on country
      let state: string;
      if (country === "USA") {
        state = USA_CITY_TO_STATE[spot.city] || "Other";
      } else if (country === "Canada") {
        state = CANADA_CITY_TO_STATE[spot.city] || "General";
      } else if (country === "Mexico") {
        state = MEXICO_CITY_TO_STATE[spot.city] || "General";
      } else {
        state = spot.region || "General";
      }
      
      if (!acc[continent]) acc[continent] = {};
      if (!acc[continent][country]) acc[continent][country] = {};
      if (!acc[continent][country][state]) acc[continent][country][state] = [];
      
      acc[continent][country][state].push(spot);
      return acc;
    }, {} as GroupedSpots);
  }, [spots]);

  const filteredSpots = useMemo(() => {
    if (!spots) return [];
    
    // Don't show any spots until filters are applied or search is used
    if (!selectedContinent && !selectedCountry && !selectedState && !searchQuery.trim()) {
      return [];
    }
    
    return spots.filter(spot => {
      const continent = CONTINENT_MAP[spot.country] || "Other";
      
      // Use appropriate state/province mapping based on country
      let state: string;
      if (spot.country === "USA") {
        state = USA_CITY_TO_STATE[spot.city] || "Other";
      } else if (spot.country === "Canada") {
        state = CANADA_CITY_TO_STATE[spot.city] || "General";
      } else if (spot.country === "Mexico") {
        state = MEXICO_CITY_TO_STATE[spot.city] || "General";
      } else {
        state = spot.region || "General";
      }
      
      // Search query filter
      const matchesSearch = !searchQuery.trim() || 
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (spot.region && spot.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
        state.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Hierarchical filters
      const matchesContinent = !selectedContinent || continent === selectedContinent;
      const matchesCountry = !selectedCountry || spot.country === selectedCountry;
      const matchesState = !selectedState || state === selectedState;
      
      return matchesSearch && matchesContinent && matchesCountry && matchesState;
    });
  }, [spots, searchQuery, selectedContinent, selectedCountry, selectedState]);

  const continents = Object.keys(groupedSpots).sort();
  const countries = selectedContinent ? Object.keys(groupedSpots[selectedContinent] || {}).sort() : [];
  const states = selectedContinent && selectedCountry 
    ? Object.keys(groupedSpots[selectedContinent]?.[selectedCountry] || {}).sort()
    : [];

  const handleSpotSelect = (spotId: number) => {
    setLocation(`/conditions?location=${spotId}`);
    // Scroll to top when navigating to the detail page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedContinent("");
    setSelectedCountry("");
    setSelectedState("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-[hsl(155,50%,8%)]">
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
    <div className="min-h-screen bg-blue-50 dark:bg-[hsl(155,50%,8%)]">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 dark:text-white">
                Global Surf Spots
              </h1>
              <p className="text-muted-foreground mt-2">
                Discover global surf spots across 6 continents with real-time conditions
              </p>
            </div>

            {/* Universal Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-input focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {(searchQuery.trim() || selectedContinent || selectedCountry || selectedState) && (
              <div>
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Hierarchical Filters */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white">Filter by Location</h3>
              <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedContinent} onValueChange={(value) => {
                setSelectedContinent(value);
                setSelectedCountry("");
                setSelectedState("");
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
                  setSelectedState("");
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

              {selectedCountry === "USA" && states.length > 1 && (
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              </div>
            </div>

            {/* Results Counter - only show when filters are active */}
            {(searchQuery.trim() || selectedContinent || selectedCountry || selectedState) && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredSpots.length} surf spot{filteredSpots.length !== 1 ? 's' : ''}
                {selectedContinent || selectedCountry || selectedState ? (
                  <span>
                    {selectedContinent && ` in ${selectedContinent}`}
                    {selectedState && ` • ${selectedState}`}
                  </span>
                ) : (
                  searchQuery.trim() ? " matching your search" : " worldwide"
                )}
              </div>
            )}
          </div>

          {/* Results - only show when filters are active */}
          {(searchQuery.trim() || selectedContinent || selectedCountry || selectedState) && (
            filteredSpots.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSpots.map((spot) => (
                  <Card 
                    key={spot.id} 
                    className="hover:shadow-lg transition-shadow border-border dark:bg-muted"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 cursor-pointer" onClick={() => handleSpotSelect(spot.id)}>
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
                        <div className="flex items-center space-x-2">
                          {spot.difficulty && (
                            <Badge 
                              variant="secondary" 
                              className={DIFFICULTY_COLORS[spot.difficulty as keyof typeof DIFFICULTY_COLORS]}
                            >
                              {spot.difficulty}
                            </Badge>
                          )}
                          <FavoriteButton 
                            locationId={spot.id} 
                            locationName={spot.name}
                            size="sm"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3" onClick={() => handleSpotSelect(spot.id)}>
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
                        className="w-full mt-3 text-blue-900 dark:text-emerald-400 border-blue-200 dark:border-emerald-600 hover:bg-blue-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                      >
                        <Waves className="h-4 w-4 mr-2" />
                        View Conditions
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-2">
                    No Surf Spots Found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your filters or selecting a different location
                  </p>
                  <Button onClick={clearFilters}>Clear All Filters</Button>
                </div>
              </div>
            )
          )}

          {/* Saved Spots Card */}
          <SavedSpotsCard />
        </div>
      </main>
      <Footer />
    </div>
  );
}