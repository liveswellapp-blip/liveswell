import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Waves, Home, Search, MapPin } from "lucide-react";
import { Location } from "@/types/weather";
import SearchModal from "./SearchModal";

interface NavigationProps {
  onLocationSelect: (location: Location) => void;
}

export default function Navigation({ onLocationSelect }: NavigationProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: searchResults = [] } = useQuery<Location[]>({
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
    setShowSearchModal(false);
    onLocationSelect(location);
  };

  const handleSearchClick = () => {
    if (isMobile) {
      setShowSearchModal(true);
    }
  };

  return (
    <nav className="bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16 w-full">
          {/* Centered container for search and favorites */}
          <div className="flex items-center space-x-6 w-full max-w-4xl justify-center">
            {/* Search Bar */}
            <div className={`relative flex-1 ${location === "/favorites" ? "max-w-none" : "max-w-lg"}`} ref={searchRef}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onClick={handleSearchClick}
                  className="w-full px-4 py-2 pr-4 bg-muted border-input focus:ring-2 focus:ring-primary focus:border-transparent"
                  readOnly={isMobile}
                  data-testid="input-search"
                />
              </div>
              
              {/* Search Suggestions - Only show on desktop */}
              {!isMobile && showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-popover border border-border rounded-lg shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((loc: Location) => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc)}
                      className="w-full px-4 py-3 text-left hover:bg-muted flex items-center space-x-3"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">{loc.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {loc.city}, {loc.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant={location === "/" ? "default" : "outline"}
                size="default"
                asChild
                className="px-4 py-2 h-10 whitespace-nowrap bg-background hover:bg-muted border-input text-white hover:text-gray-300 transition-colors"
              >
                <Link href="/">
                  <Waves className="h-4 w-4 mr-2 text-white" />
                  Surf Spots
                </Link>
              </Button>
              

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onLocationSelect={handleLocationSelect}
        initialQuery={searchQuery}
      />
    </nav>
  );
}