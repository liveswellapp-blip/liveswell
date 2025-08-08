import { useState } from "react";
import { useLocation } from "wouter";
import FavoritesList from "@/components/FavoritesList";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import { Location } from "@/types/weather";

export default function Favorites() {
  const [, setLocation] = useLocation();

  const handleLocationSelect = (location: Location) => {
    // Navigate to conditions page with location ID (better for loading states)
    setLocation(`/conditions?location=${location.id}`);
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-[hsl(155,50%,8%)]">
      <Header />
      <Navigation onLocationSelect={handleLocationSelect} />
      <div className="container mx-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <FavoritesList onLocationSelect={handleLocationSelect} />
        </div>
      </div>
    </div>
  );
}