import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer, Eye, Sun, Sunrise } from "lucide-react";
import { Location, SurfConditions } from "@/types/weather";

interface DetailedDataProps {
  location: Location;
}

export default function DetailedData({ location }: DetailedDataProps) {
  // This component is now empty as all weather data has been moved to Live Conditions
  return null;
}
