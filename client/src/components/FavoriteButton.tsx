import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Waves } from "lucide-react";
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
        title: "Added to surf spots",
        description: `${locationName} has been added to your surf spots.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", locationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to surf spots",
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
        title: "Removed from surf spots",
        description: `${locationName} has been removed from your surf spots.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", locationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from surf spots",
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
          ? "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:hover:bg-emerald-900/30" 
          : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-emerald-900/10 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
      }`}
      onClick={handleToggleFavorite}
      disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
    >
      <Waves
        className={`${iconSizes[size]} ${
          isFavorite ? "fill-blue-500 text-blue-500 dark:fill-emerald-400 dark:text-emerald-400" : "text-gray-400 dark:text-emerald-400 hover:text-blue-400 dark:hover:text-emerald-400"
        }`}
      />
    </Button>
  );
}