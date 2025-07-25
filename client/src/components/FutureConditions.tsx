import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Location } from "@/types/weather";

interface FutureConditionsProps {
  location: Location;
}

interface FutureWindData {
  date: string;
  dateLabel: string;
  windSpeed: string;
  windDirection: string;
  timestamp: string;
}

export default function FutureConditions({ location }: FutureConditionsProps) {
  const { data: futureData, isLoading } = useQuery<FutureWindData[]>({
    queryKey: [`/api/locations/${location.id}/future-conditions`],
    enabled: !!location.id,
  });

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Card className="bg-black/90 backdrop-blur border-gray-800">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Future Conditions
              </h2>
            </div>

            {/* Future Wind Card */}
            <div className="rounded-lg p-4 bg-muted text-white border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-5 w-5 text-white" />
                  <span className="text-base font-medium">Wind</span>
                </div>
                <span className="text-sm opacity-75">Next 48 Hours</span>
              </div>

            {/* Future Data Grid - Scrollable for 48 hours */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2 historical-scroll">
              {isLoading ? (
                // Loading skeletons for first 8 hours
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-20 bg-white/20" />
                      <Skeleton className="h-5 w-12 bg-white/20" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-16 bg-white/20" />
                        <Skeleton className="h-4 w-20 bg-white/20" />
                      </div>
                    </div>
                  </div>
                ))
              ) : futureData ? (
                futureData.map((data, index) => {
                  // Check if we need to show a date separator
                  const showDateSeparator = index === 0 || 
                    (index > 0 && data.dateLabel !== futureData[index - 1].dateLabel);
                  
                  return (
                    <div key={index}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center mb-3 mt-2">
                          <div className="flex-1 border-t border-emerald-600/30"></div>
                          <div className="px-3 text-xs font-medium text-emerald-400 uppercase tracking-wide">
                            {data.dateLabel}
                          </div>
                          <div className="flex-1 border-t border-emerald-600/30"></div>
                        </div>
                      )}
                      
                      {/* Wind Data Card */}
                      <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{data.date}</span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {data.windSpeed} mph {data.windDirection}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-white opacity-75">No future wind data available</p>
                </div>
              )}
            </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}