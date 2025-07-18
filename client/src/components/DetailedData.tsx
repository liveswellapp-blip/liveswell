import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer, Eye, Sun, Sunrise } from "lucide-react";
import { Location, SurfConditions } from "@/types/weather";

interface DetailedDataProps {
  location: Location;
}

export default function DetailedData({ location }: DetailedDataProps) {
  const { data: conditions, isLoading } = useQuery<SurfConditions>({
    queryKey: [`/api/locations/${location.id}/conditions`],
  });

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Marine Weather */}
        <Card className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">Marine Weather</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <Thermometer className="text-blue-900 dark:text-emerald-400 h-5 w-5" />
                <span className="font-medium text-blue-900 dark:text-emerald-400">Water Temperature</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <span className="text-lg font-semibold text-blue-900 dark:text-white">
                  {conditions?.waterTemp || "0"}°F
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="text-blue-900 dark:text-emerald-400 h-5 w-5" />
                <span className="font-medium text-blue-900 dark:text-emerald-400">Visibility</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <span className="text-lg font-semibold text-blue-900 dark:text-white">
                  {conditions?.visibility || "0"} miles
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <Sun className="text-blue-900 dark:text-emerald-400 h-5 w-5" />
                <span className="font-medium text-blue-900 dark:text-emerald-400">UV Index</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <span className="text-lg font-semibold text-blue-900 dark:text-white">
                  {conditions?.uvIndex || 0} {conditions?.uvIndex && conditions.uvIndex > 7 ? "(Very High)" : conditions?.uvIndex && conditions.uvIndex > 5 ? "(High)" : conditions?.uvIndex && conditions.uvIndex > 2 ? "(Moderate)" : "(Low)"}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <Sunrise className="text-blue-900 dark:text-emerald-400 h-5 w-5" />
                <span className="font-medium text-blue-900 dark:text-emerald-400">Sunrise / Sunset</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <span className="text-lg font-semibold text-blue-900 dark:text-white">
                  {conditions?.sunrise || "6:28 AM"} / {conditions?.sunset || "7:42 PM"}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
