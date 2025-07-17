import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Home, Search, MapPin } from "lucide-react";
import { Location } from "@/types/weather";

interface NavigationProps {
  onLocationSelect: (location: Location) => void;
}

export default function Navigation({ onLocationSelect }: NavigationProps) {
  const [location] = useLocation();
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
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search coastal cities..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 pr-4 bg-alice-blue border-sky-blue focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 ocean-blue h-4 w-4" />
              </div>
              
              {/* Search Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((loc: Location) => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc)}
                      className="w-full px-4 py-3 text-left hover:bg-alice-blue flex items-center space-x-3"
                    >
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium dark-slate">{loc.name}</div>
                        <div className="text-sm text-gray-500">
                          {loc.city}, {loc.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              variant={location === "/favorites" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/favorites">
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}