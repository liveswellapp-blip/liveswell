import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, X } from "lucide-react";
import { Location } from "@/types/weather";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: Location) => void;
  initialQuery?: string;
}

export default function SearchModal({ isOpen, onClose, onLocationSelect, initialQuery = "" }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  const { data: searchResults = [], isLoading } = useQuery<Location[]>({
    queryKey: [`/api/locations/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2 && isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Handle viewport height changes for mobile keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      // Use visual viewport if available (better for mobile keyboards)
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
    };

    if (isOpen && typeof window !== 'undefined') {
      // Listen for visual viewport changes (more accurate for mobile keyboards)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
      } else {
        // Fallback to window resize
        window.addEventListener('resize', handleViewportChange);
      }
      
      // Initial height check
      handleViewportChange();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isOpen]);

  const handleLocationSelect = (location: Location) => {
    onLocationSelect(location);
    onClose();
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  // Calculate dynamic height for mobile keyboard support
  const isMobile = window.innerWidth <= 768;
  const maxHeight = isMobile ? Math.min(viewportHeight * 0.8, 600) : '85vh';
  const resultsHeight = isMobile ? Math.max(200, viewportHeight * 0.4) : 280;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px] p-0 gap-0 flex flex-col"
        style={{ maxHeight: isMobile ? `${maxHeight}px` : maxHeight }}
      >
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Search Surf Spots
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 flex-shrink-0">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for a surf spot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-muted border-input focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              autoFocus
              data-testid="input-search-modal"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
        </div>

        {/* Search Results - Scrollable container */}
        <div className="flex-1 px-6 pb-6 min-h-0">
          {searchQuery.length < 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-1">Find surf spots around the world</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-3">
                  <Skeleton className="h-8 w-8" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div 
              className="space-y-1 overflow-y-auto historical-scroll"
              style={{ height: `${resultsHeight}px` }}
            >
              {searchResults.map((location: Location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-3 py-4 text-left hover:bg-muted rounded-lg flex items-center space-x-3 transition-colors"
                  data-testid={`button-location-${location.id}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{location.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {location.city}, {location.country}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No surf spots found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}