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
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Card className="bg-black/90 backdrop-blur border-gray-800">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Historical Conditions
              </h2>
            </div>

            {/* Historical Swell Card */}
            <div className="rounded-lg p-4 bg-muted text-white border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Waves className="h-5 w-5 text-white" />
                  <span className="text-base font-medium">Swell</span>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-sm opacity-75">Past 24 Hours</span>
              </div>

            {/* Historical Data Grid - Scrollable for 24 hours */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
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
                historicalData.map((data, index) => (
                <div key={index} className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">
                      {data.date}
                    </span>
                    <div className="flex items-center space-x-4">
                      {/* Wave Height */}
                      <div className="text-right">
                        <span className="text-lg font-semibold text-emerald-400">
                          {data.waveHeight} ft
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Period and Direction */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-white">
                        Period: <span className="text-emerald-400">{data.wavePeriod}s</span>
                      </span>
                      <span className="text-white">
                        Direction: <span className="text-emerald-400">{data.waveDirection}</span>
                      </span>
                    </div>
                  </div>
                </div>
                ))
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
    </section>
  );
}