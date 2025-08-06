import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Activity, Users, Database, Globe, BarChart3, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
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

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
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
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-semibold">User Activity</div>
                  <div className="text-sm text-muted-foreground">View recent user actions</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-semibold">Error Logs</div>
                  <div className="text-sm text-muted-foreground">Check application errors</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-semibold">Database Stats</div>
                  <div className="text-sm text-muted-foreground">218 surf spots, user data</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}