import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Location } from "@/types/weather";

interface HistoricalConditionsProps {
  location: Location;
}

interface HistoricalSwellData {
  date: string;
  dateLabel: string;
  waveHeight: string;
  wavePeriod: number;
  waveDirection: string;
  timestamp: string;
}

export default function HistoricalConditions({ location }: HistoricalConditionsProps) {
  const { data: historicalData, isLoading } = useQuery<HistoricalSwellData[]>({
    queryKey: [`/api/locations/${location.id}/historical-conditions`],
    enabled: !!location.id,
  });

  return (
    <div className="w-full">
      <Card className="bg-black/90 backdrop-blur border-0 md:border md:border-gray-800 md:mx-auto md:max-w-7xl rounded-none md:rounded-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Historical Conditions
              </h2>
            </div>

            {/* Historical Swell Card */}
            <div className="rounded-lg p-4 bg-muted text-white border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Waves className="h-5 w-5 text-white" />
                  <span className="text-base font-medium">Swell</span>
                </div>
                <span className="text-sm opacity-75">Past 24 Hours</span>
              </div>

            {/* Historical Data Grid - Scrollable for 24 hours */}
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
              ) : historicalData ? (
                historicalData.map((data, index) => {
                  // Check if we need to show a date separator
                  const showDateSeparator = index === 0 || 
                    (index > 0 && data.dateLabel !== historicalData[index - 1].dateLabel);
                  
                  return (
                    <div key={index}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center mb-3 mt-2">
                          <div className="border-t border-emerald-800/50 flex-1"></div>
                          <span className="px-3 text-xs text-emerald-400 font-medium bg-emerald-900/20 rounded-full py-1">
                            {data.dateLabel}
                          </span>
                          <div className="border-t border-emerald-800/50 flex-1"></div>
                        </div>
                      )}
                      
                      {/* Data Row */}
                      <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">
                            {data.date}
                          </span>
                          <div className="flex items-center space-x-4 text-sm">
                            {/* Wave Height */}
                            <span className="text-emerald-400 font-semibold">
                              {data.waveHeight} ft
                            </span>
                            {/* Wave Period */}
                            <span className="text-emerald-400 font-semibold">
                              {data.wavePeriod}s
                            </span>
                            {/* Wave Direction */}
                            <span className="text-emerald-400 font-semibold">
                              {data.waveDirection}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50 text-center">
                  <span className="text-white">No historical data available</span>
                </div>
              )}
            </div>
            </div>
          </div>
        </Card>
    </div>
  );
}