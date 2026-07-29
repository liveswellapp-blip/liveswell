import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Activity, Users, Database, Globe, BarChart3, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import UserDatabase from "@/components/UserDatabase";
import ErrorLogs from "@/components/ErrorLogs";
import SurfSpotsMonitoring from "@/components/SurfSpotsMonitoring";

interface AdminSession {
  isAuthenticated: boolean;
  username?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    openweather: 'healthy' | 'degraded' | 'unhealthy';
    noaa: 'healthy' | 'degraded' | 'unhealthy';
  };
  performance: {
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    responseTime: number;
    activeConnections: number;
  };
}

interface ApiMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rateLimit: number;
  };
  openweather: {
    requestsToday: number;
    dailyLimit: number;
    remainingCalls: number;
    lastError?: string;
  };
  noaa: {
    requestsToday: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

interface UsageForecast {
  uniqueLocations: number;
  checksPerDay: number;
  estimatedCallsPerDay: number;
  dailyLimit: number;
  remainingQuota: number;
  capacityRemaining: number | null;
  utilizationPct: number;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showUserDatabase, setShowUserDatabase] = useState(false);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [showSurfSpotsMonitoring, setShowSurfSpotsMonitoring] = useState(false);
  const { toast } = useToast();

  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(errorData.error || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({ title: "Success", description: "Admin login successful" });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  });

  // Health check query - only run when authenticated
  const { data: healthData, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Metrics query - only run when authenticated
  const { data: metricsData, isLoading: metricsLoading } = useQuery<ApiMetrics>({
    queryKey: ['/api/metrics'],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  // Daily API usage forecast - only run when authenticated
  const { data: forecastData } = useQuery<UsageForecast>({
    queryKey: ['/api/admin/usage-forecast'],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-600 p-3 rounded-full mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">LiveSwell Admin</CardTitle>
            <p className="text-muted-foreground">Access monitoring dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter admin username"
                  data-testid="input-admin-username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter admin password"
                  data-testid="input-admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show User Database
  if (showUserDatabase) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl px-6">
          <UserDatabase onClose={() => setShowUserDatabase(false)} />
        </div>
      </div>
    );
  }

  // Show Error Logs
  if (showErrorLogs) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl px-6">
          <ErrorLogs onClose={() => setShowErrorLogs(false)} />
        </div>
      </div>
    );
  }

  // Show Surf Spots Monitoring
  if (showSurfSpotsMonitoring) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl px-6">
          <SurfSpotsMonitoring onClose={() => setShowSurfSpotsMonitoring(false)} />
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LiveSwell Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor application health and performance</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsAuthenticated(false)}
            data-testid="button-admin-logout"
          >
            Logout
          </Button>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {healthData && getStatusIcon(healthData.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {healthLoading ? 'Loading...' : healthData?.status || 'Unknown'}
              </div>
              <p className="text-xs text-muted-foreground">
                Uptime: {healthData ? formatUptime(healthData.uptime) : '--'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? 'Loading...' : metricsData?.requests.total.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Success Rate: {metricsData ? Math.round((metricsData.requests.successful / metricsData.requests.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthLoading ? 'Loading...' : healthData ? formatBytes(healthData.performance.memoryUsage.heapUsed) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Heap: {healthData ? formatBytes(healthData.performance.memoryUsage.heapTotal) : '--'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthLoading ? 'Loading...' : healthData ? `${healthData.performance.responseTime}ms` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Connections: {healthData?.performance.activeConnections || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Services Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Database</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthData.services.database)}
                      <span className="capitalize">{healthData.services.database}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>OpenWeather API</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthData.services.openweather)}
                      <span className="capitalize">{healthData.services.openweather}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NOAA Data</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthData.services.noaa)}
                      <span className="capitalize">{healthData.services.noaa}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Loading services status...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>API Usage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsData ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>OpenWeather Calls Today</span>
                      <span>{metricsData.openweather.requestsToday} / {metricsData.openweather.dailyLimit}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(metricsData.openweather.requestsToday / metricsData.openweather.dailyLimit) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p><strong>NOAA Requests:</strong> {metricsData.noaa.requestsToday}</p>
                    <p><strong>Failed Requests:</strong> {metricsData.requests.failed}</p>
                    <p><strong>Rate Limited:</strong> {metricsData.requests.rateLimit}</p>
                  </div>
                </div>
              ) : (
                <p>Loading API metrics...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily API Usage Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Daily API Usage Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecastData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{forecastData.uniqueLocations}</div>
                    <div className="text-xs text-muted-foreground mt-1">Monitored locations</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{forecastData.estimatedCallsPerDay.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">Est. calls / day</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{forecastData.dailyLimit.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">Daily cap (free tier)</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${forecastData.remainingQuota <= 0 ? 'bg-red-100 dark:bg-red-900/30' : forecastData.utilizationPct >= 80 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <div className={`text-2xl font-bold ${forecastData.remainingQuota <= 0 ? 'text-red-600' : forecastData.utilizationPct >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {forecastData.remainingQuota.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Remaining quota</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quota utilization</span>
                    <span>{forecastData.utilizationPct}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${forecastData.utilizationPct >= 90 ? 'bg-red-500' : forecastData.utilizationPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(forecastData.utilizationPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Plain-English explanation */}
                <div className={`rounded-md p-3 text-sm ${forecastData.remainingQuota <= 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : forecastData.utilizationPct >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'}`}>
                  {forecastData.remainingQuota <= 0 ? (
                    <p>⚠️ <strong>Over the daily cap.</strong> At {forecastData.uniqueLocations} monitored location{forecastData.uniqueLocations !== 1 ? 's' : ''}, the estimated {forecastData.estimatedCallsPerDay.toLocaleString()} calls/day exceeds the {forecastData.dailyLimit.toLocaleString()} free-tier limit. Weather data may fall back to demo data until the counter resets at midnight UTC.</p>
                  ) : forecastData.utilizationPct >= 80 ? (
                    <p>⚠️ <strong>Approaching the daily cap ({forecastData.utilizationPct}% used).</strong> You have room for roughly {forecastData.capacityRemaining ?? 0} more monitored location{(forecastData.capacityRemaining ?? 0) !== 1 ? 's' : ''} before hitting the {forecastData.dailyLimit.toLocaleString()}-call free-tier limit.</p>
                  ) : forecastData.uniqueLocations === 0 ? (
                    <p>✅ <strong>No locations monitored yet.</strong> The {forecastData.dailyLimit.toLocaleString()} daily call quota is fully available. Each new unique surf spot adds {forecastData.checksPerDay} calls/day.</p>
                  ) : (
                    <p>✅ <strong>Well within limits.</strong> {forecastData.uniqueLocations} location{forecastData.uniqueLocations !== 1 ? 's' : ''} × {forecastData.checksPerDay} checks/day = {forecastData.estimatedCallsPerDay.toLocaleString()} calls. You can add {forecastData.capacityRemaining ?? 0} more location{(forecastData.capacityRemaining ?? 0) !== 1 ? 's' : ''} before reaching the {forecastData.dailyLimit.toLocaleString()} free-tier cap.</p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Checks run every 20 min ({forecastData.checksPerDay} cycles/day). Estimate resets at midnight UTC.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading forecast...</p>
            )}
          </CardContent>
        </Card>

        {/* Additional Admin Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User & System Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={() => setShowUserDatabase(true)}
                data-testid="button-user-database"
              >
                <div className="text-left">
                  <div className="font-semibold">User Database</div>
                  <div className="text-sm text-muted-foreground">View all users and their data</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={() => setShowErrorLogs(true)}
                data-testid="button-error-logs"
              >
                <div className="text-left">
                  <div className="font-semibold">Error Logs</div>
                  <div className="text-sm text-muted-foreground">Check application errors</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={() => setShowSurfSpotsMonitoring(true)}
                data-testid="button-surf-spots-monitoring"
              >
                <div className="text-left">
                  <div className="font-semibold">Surf Spots Monitoring</div>
                  <div className="text-sm text-muted-foreground">218 surf spots, live data & NOAA stations</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}