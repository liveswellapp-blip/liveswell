import { useState } from "react";
import { useLocation } from "wouter";
import FavoritesList from "@/components/FavoritesList";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import { Location } from "@/types/weather";

export default function Favorites() {
  const [, setLocation] = useLocation();

  const handleLocationSelect = (location: Location) => {
    // Navigate to home page with location name as URL parameter
    setLocation(`/?location=${encodeURIComponent(location.name)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-900 dark:from-black dark:to-emerald-900">
      <Header />
      <Navigation onLocationSelect={handleLocationSelect} />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <FavoritesList onLocationSelect={handleLocationSelect} />
        </div>
      </div>
    </div>
  );
}