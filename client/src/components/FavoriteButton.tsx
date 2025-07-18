import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FavoriteButtonProps {
  locationId: number;
  locationName: string;
  size?: "sm" | "md" | "lg";
}

export default function FavoriteButton({ locationId, locationName, size = "md" }: FavoriteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if location is favorited
  const { data: favoriteStatus } = useQuery({
    queryKey: ["/api/favorites", locationId],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${locationId}`);
      if (!response.ok) throw new Error("Failed to check favorite status");
      return response.json();
    },
  });

  const isFavorite = favoriteStatus?.isFavorite || false;

  // Add to favorites
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/favorites", {
        method: "POST",
        body: { locationId },
      });
    },
    onSuccess: () => {
      toast({
        title: "Added to favorites",
        description: `${locationName} has been added to your favorites.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", locationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to favorites",
        variant: "destructive",
      });
    },
  });

  // Remove from favorites
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/favorites/${locationId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Removed from favorites",
        description: `${locationName} has been removed from your favorites.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", locationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from favorites",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={`${sizeClasses[size]} ${
        isFavorite 
          ? "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/30" 
          : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-emerald-900/10 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
      }`}
      onClick={handleToggleFavorite}
      disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
    >
      <Heart
        className={`${iconSizes[size]} ${
          isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 dark:text-emerald-400"
        }`}
      />
    </Button>
  );
}