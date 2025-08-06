import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  MapPin, 
  Search, 
  RefreshCw,
  Waves,
  Thermometer,
  Wind,
  Eye,
  Clock,
  Heart,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  PlayCircle,
  Loader2
} from "lucide-react";

interface SurfSpot {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  noaaStationId?: string;
  lastUpdated?: string;
  currentConditions?: any;
  favoriteCount: number;
  dataQuality: 'excellent' | 'good' | 'poor' | 'no-data';
}

interface SurfSpotDetails {
  spot: {
    id: number;
    name: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    noaaStationId?: string;
  };
  conditions: {
    waveHeight: string;
    wavePeriod: string;
    windSpeed: string;
    windDirection: string;
    temperature: string;
    waterTemp: string;
    updatedAt: string;
  } | null;
  favorites: number;
  recentActivity: Array<{
    timestamp: string;
    event: string;
    details: any;
  }>;
  noaaData: {
    stationId: string;
    lastUpdate: string;
    status: 'active' | 'inactive' | 'error';
  };
}

interface SurfSpotsStats {
  totalSpots: number;
  activeStations: number;
  dataQuality: {
    excellent: number;
    good: number;
    poor: number;
    noData: number;
  };
  topCountries: Array<{name: string; count: number}>;
  recentUpdates: number;
}

interface SurfSpotsMonitoringProps {
  onClose: () => void;
}

function DataQualityAuditButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const auditMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/audit-all-spots', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      console.log('Audit response:', data);
      if (data.success) {
        toast({
          title: "Data Quality Audit Complete",
          description: `Successfully updated ${data.results.successCount}/${data.results.totalLocations} surf spots. ${data.results.errorCount} errors.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Audit Completed with Issues",
          description: data.message || "Some locations failed to update",
          variant: "destructive",
        });
      }
      
      // Refresh the data after audit
      queryClient.invalidateQueries({ queryKey: ['/api/admin/surf-spots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/surf-spots-stats'] });
    },
    onError: (error: any) => {
      console.error('Audit error:', error);
      toast({
        title: "Audit Failed",
        description: error.message || "Failed to run data quality audit",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="default"
      onClick={() => auditMutation.mutate()}
      disabled={auditMutation.isPending}
      className="flex items-center gap-2"
      data-testid="button-audit-all"
    >
      {auditMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      {auditMutation.isPending ? 'Running Audit...' : 'Audit All Spots'}
    </Button>
  );
}

export default function SurfSpotsMonitoring({ onClose }: SurfSpotsMonitoringProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string>("all");

  // Fetch surf spots statistics
  const { data: spotsStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SurfSpotsStats>({
    queryKey: ['/api/admin/surf-spots-stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all surf spots with search
  const { data: surfSpots, isLoading: spotsLoading, refetch: refetchSpots } = useQuery<{
    logs: SurfSpot[];
    total: number;
  }>({
    queryKey: ['/api/admin/surf-spots', searchTerm],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter spots by data quality
  const filteredSpots = surfSpots?.logs ? surfSpots.logs.filter(spot => {
    if (qualityFilter === "all") return true;
    return spot.dataQuality === qualityFilter;
  }) : [];

  // Fetch selected spot details
  const { data: spotDetails, isLoading: detailsLoading } = useQuery<SurfSpotDetails>({
    queryKey: [`/api/admin/surf-spots/${selectedSpot}`],
    enabled: !!selectedSpot,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchSpots();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'poor':
        return 'warning';
      case 'no-data':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getDataQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'poor':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'no-data':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  // Spot Details Modal
  if (selectedSpot && spotDetails) {
    const spot = spotDetails.spot;
    
    return (
      <Dialog open={true} onOpenChange={() => setSelectedSpot(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedSpot(null)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <MapPin className="h-5 w-5" />
              <span>{spot.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Spot Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Location:</span>
                    <p className="text-muted-foreground">{spot.city}, {spot.state}, {spot.country}</p>
                  </div>
                  <div>
                    <span className="font-medium">Coordinates:</span>
                    <p className="text-muted-foreground">{spot.latitude}°, {spot.longitude}°</p>
                  </div>
                  <div>
                    <span className="font-medium">NOAA Station:</span>
                    <p className="text-muted-foreground">{spot.noaaStationId || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Favorites:</span>
                    <p className="text-muted-foreground flex items-center">
                      <Heart className="h-4 w-4 mr-1 text-red-500" />
                      {spotDetails.favorites} users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Conditions */}
            {spotDetails.conditions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Waves className="h-5 w-5 mr-2" />
                    Current Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded">
                      <Waves className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{spotDetails.conditions.waveHeight}</div>
                      <div className="text-sm text-muted-foreground">Wave Height</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded">
                      <Wind className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold">{spotDetails.conditions.windSpeed}</div>
                      <div className="text-sm text-muted-foreground">Wind Speed</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded">
                      <Thermometer className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <div className="text-2xl font-bold">{spotDetails.conditions.temperature}</div>
                      <div className="text-sm text-muted-foreground">Air Temp</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded">
                      <Thermometer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{spotDetails.conditions.waterTemp}</div>
                      <div className="text-sm text-muted-foreground">Water Temp</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Last updated: {formatDate(spotDetails.conditions.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NOAA Data Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Source Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(spotDetails.noaaData.status)}
                    <div>
                      <p className="font-medium">NOAA Station {spotDetails.noaaData.stationId}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {spotDetails.noaaData.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Last Update:</p>
                    <p>{spotDetails.noaaData.lastUpdate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {spotDetails.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border-l-4 border-blue-500 bg-muted/50">
                      <div>
                        <p className="font-medium">{activity.event}</p>
                        <p className="text-sm text-muted-foreground">
                          {JSON.stringify(activity.details)}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main Surf Spots Monitoring View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Surf Spots Monitoring</h2>
          <p className="text-muted-foreground">Monitor all surf locations and live data</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DataQualityAuditButton />
          <Button onClick={onClose} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : spotsStats?.totalSpots || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Surf Spots</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : spotsStats?.activeStations || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active NOAA Stations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : spotsStats?.dataQuality.excellent || 0}
            </div>
            <p className="text-sm text-muted-foreground">Excellent Data Quality</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : spotsStats?.recentUpdates || 0}
            </div>
            <p className="text-sm text-muted-foreground">Updates (24h)</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Distribution */}
      {spotsStats && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                onClick={() => setQualityFilter(qualityFilter === "excellent" ? "all" : "excellent")}
                data-testid="filter-excellent"
              >
                <div className="text-2xl font-bold text-green-600">{spotsStats.dataQuality.excellent}</div>
                <div className="text-sm text-muted-foreground">Excellent</div>
                {qualityFilter === "excellent" && <div className="text-xs text-green-600 mt-1">● Active Filter</div>}
              </div>
              <div 
                className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                onClick={() => setQualityFilter(qualityFilter === "good" ? "all" : "good")}
                data-testid="filter-good"
              >
                <div className="text-2xl font-bold text-blue-600">{spotsStats.dataQuality.good}</div>
                <div className="text-sm text-muted-foreground">Good</div>
                {qualityFilter === "good" && <div className="text-xs text-blue-600 mt-1">● Active Filter</div>}
              </div>
              <div 
                className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                onClick={() => setQualityFilter(qualityFilter === "poor" ? "all" : "poor")}
                data-testid="filter-poor"
              >
                <div className="text-2xl font-bold text-yellow-600">{spotsStats.dataQuality.poor}</div>
                <div className="text-sm text-muted-foreground">Poor</div>
                {qualityFilter === "poor" && <div className="text-xs text-yellow-600 mt-1">● Active Filter</div>}
              </div>
              <div 
                className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                onClick={() => setQualityFilter(qualityFilter === "no-data" ? "all" : "no-data")}
                data-testid="filter-no-data"
              >
                <div className="text-2xl font-bold text-red-600">{spotsStats.dataQuality.noData}</div>
                <div className="text-sm text-muted-foreground">No Data</div>
                {qualityFilter === "no-data" && <div className="text-xs text-red-600 mt-1">● Active Filter</div>}
              </div>
            </div>
            <div className="text-center mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setQualityFilter("all")}
                disabled={qualityFilter === "all"}
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search surf spots by name, city, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-spot-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="w-48" data-testid="select-quality-filter">
                  <SelectValue placeholder="Filter by data quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quality Levels</SelectItem>
                  <SelectItem value="excellent">Excellent Data</SelectItem>
                  <SelectItem value="good">Good Data</SelectItem>
                  <SelectItem value="poor">Poor Data</SelectItem>
                  <SelectItem value="no-data">No Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surf Spots List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Surf Spots {qualityFilter !== "all" && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                · Filtered by {qualityFilter.replace('-', ' ')} quality
              </span>
            )}
          </CardTitle>
          {filteredSpots.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {filteredSpots.length} of {surfSpots?.logs.length || 0} spots
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {spotsLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSpots.length > 0 ? (
            <div className="space-y-2">
              {filteredSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="flex items-center justify-between p-4 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSpot(spot.id)}
                  data-testid={`surf-spot-${spot.id}`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getDataQualityIcon(spot.dataQuality)}
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{spot.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Globe className="h-3 w-3 mr-1" />
                          {spot.city}, {spot.state}, {spot.country}
                        </span>
                        {spot.noaaStationId && (
                          <span>Station: {spot.noaaStationId}</span>
                        )}
                        <span className="flex items-center">
                          <Heart className="h-3 w-3 mr-1 text-red-500" />
                          {spot.favoriteCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getDataQualityColor(spot.dataQuality) as any} className="capitalize">
                      {spot.dataQuality.replace('-', ' ')}
                    </Badge>
                    {spot.lastUpdated && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(spot.lastUpdated)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || qualityFilter !== "all" 
                  ? `No surf spots found ${searchTerm ? 'matching your search' : ''} ${qualityFilter !== "all" ? `with ${qualityFilter.replace('-', ' ')} data quality` : ''}`
                  : 'No surf spots found'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Countries */}
      {spotsStats?.topCountries && spotsStats.topCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Countries by Surf Spots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {spotsStats.topCountries.map((country, index) => (
                <div key={country.name} className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <span className="font-medium">{country.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {country.count} spots
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}