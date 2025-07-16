import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Settings, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Location } from "@/types/weather";

interface HeaderProps {
  onLocationSelect: (location: Location) => void;
  onGetCurrentLocation: () => void;
  isLoadingLocation: boolean;
}

export default function Header({ onLocationSelect, onGetCurrentLocation, isLoadingLocation }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [] } = useQuery({
    queryKey: [`/api/locations/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleLocationSelect = (location: Location) => {
    setSearchQuery(location.name);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold ocean-blue">
              <span className="mr-2">🌊</span>
              SurfCast
            </h1>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 relative" ref={searchRef}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search coastal cities worldwide..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-4 bg-alice-blue border-sky-blue focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 ocean-blue h-5 w-5" />
            </div>
            
            {/* Search Suggestions */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                {searchResults.map((location: Location) => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-alice-blue flex items-center space-x-3"
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium dark-slate">{location.name}</div>
                      <div className="text-sm text-gray-500">
                        {location.city}, {location.country}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location & Settings */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onGetCurrentLocation}
              disabled={isLoadingLocation}
              className="ocean-blue hover:sky-blue"
            >
              {isLoadingLocation ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="ocean-blue hover:sky-blue">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
