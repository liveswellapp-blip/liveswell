import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Globe, Users, RefreshCw, Download } from "lucide-react";

interface SurfSpotStats {
  totalSpots: number;
  countries: number;
  countryBreakdown: Record<string, number>;
  regionBreakdown: Record<string, number>;
  lastUpdated: string;
}

export default function SurfSpotStats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error } = useQuery<SurfSpotStats>({
    queryKey: ["/api/spots/stats"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/spots/import", {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import Successful",
        description: `${data.totalSpots} surf spots now available in the database.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/spots/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations/search"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import additional surf spots",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <Card className="bg-card rounded-xl shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Globe className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Surf Spot Database</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load surf spot statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-white">
            <Globe className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Surf Spot Database</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const topCountries = Object.entries(stats.countryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const topRegions = Object.entries(stats.regionBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <Card className="bg-card rounded-xl shadow-lg border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-900 dark:text-white">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-900 dark:text-emerald-400" />
            <span>Global Surf Spot Database</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="text-blue-900 dark:text-emerald-400 border-blue-900 dark:border-emerald-400"
          >
            {importMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {importMutation.isPending ? "Importing..." : "Update Database"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-coral-500 dark:text-coral-400">
              {stats.totalSpots.toLocaleString()}
            </div>
            <div className="text-sm text-blue-900 dark:text-emerald-400">Total Surf Spots</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gold-500 dark:text-gold-400">
              {stats.countries}
            </div>
            <div className="text-sm text-blue-900 dark:text-emerald-400">Countries</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">
              {Object.keys(stats.regionBreakdown).length}
            </div>
            <div className="text-sm text-blue-900 dark:text-emerald-400">Regions</div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="space-y-3">
          <h4 className="font-semibold text-blue-900 dark:text-white flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-900 dark:text-emerald-400" />
            <span>Top Countries by Surf Spots</span>
          </h4>
          <div className="space-y-2">
            {topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center justify-between">
                <span className="text-blue-900 dark:text-emerald-400">{country}</span>
                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/20 text-blue-900 dark:text-emerald-400">
                  {count} spots
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top US Regions */}
        {topRegions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-900 dark:text-white flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-900 dark:text-emerald-400" />
              <span>Popular Surf Regions</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {topRegions.map(([region, count]) => (
                <div key={region} className="flex items-center justify-between bg-muted rounded p-2">
                  <span className="text-sm text-blue-900 dark:text-emerald-400">{region}</span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(stats.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}