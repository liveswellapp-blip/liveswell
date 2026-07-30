import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, Server, Database, Cloud, AlertTriangle, CheckCircle, Clock, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    responseTime: number;
    activeConnections: number;
  };
}

interface Metrics {
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
  };
  noaa: {
    requestsToday: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestAt?: string;
    lastSuccessAt?: string;
    idleMinutes: number | null;
    stale: boolean;
  };
  performance: {
    averageResponseTime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    uptime: number;
  };
  lastReset?: string;
  timestamp: string;
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', icon: CheckCircle };
      case 'degraded':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', icon: AlertTriangle };
      case 'unhealthy':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100', icon: AlertTriangle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MonitoringDashboard() {
  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ['/api/metrics'],
    refetchInterval: 60000, // Refresh every minute
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/admin/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/status'] });
      window.location.href = '/monitoring';
    }
  });

  if (healthLoading || metricsLoading) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Activity className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading system status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header with logout button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time application health and performance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Overall application status and uptime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={health?.status || 'unknown'} />
              <span className="text-sm text-muted-foreground">
                Uptime: {health ? formatUptime(health.uptime) : 'Unknown'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Last check: {health ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <StatusBadge status={health?.services.database || 'unknown'} />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Cloud className="w-4 h-4" />
                <span className="text-sm font-medium">Weather API</span>
              </div>
              <StatusBadge status={health?.services.openweather || 'unknown'} />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Server className="w-4 h-4" />
                <span className="text-sm font-medium">NOAA</span>
              </div>
              <StatusBadge status={health?.services.noaa || 'unknown'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Response times and system resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Average Response Time</span>
                <span>{metrics?.performance.averageResponseTime || 0}ms</span>
              </div>
              <Progress 
                value={Math.min((metrics?.performance.averageResponseTime || 0) / 10, 100)} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Memory Usage</span>
                <span>{formatBytes(health?.performance.memoryUsage.heapUsed || 0)}</span>
              </div>
              <Progress 
                value={health?.performance.memoryUsage.heapUsed && health?.performance.memoryUsage.heapTotal 
                  ? (health.performance.memoryUsage.heapUsed / health.performance.memoryUsage.heapTotal) * 100 
                  : 0
                } 
                className="h-2"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Active Connections: {health?.performance.activeConnections || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
            <CardDescription>Request statistics and rate limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Requests</span>
                <span>{metrics?.requests.total || 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Success Rate</span>
                <span>
                  {metrics?.requests.total 
                    ? Math.round((metrics.requests.successful / metrics.requests.total) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>OpenWeather API</span>
                <span>{metrics?.openweather.requestsToday || 0} / {metrics?.openweather.dailyLimit || 1000}</span>
              </div>
              <Progress 
                value={metrics?.openweather.dailyLimit 
                  ? (metrics.openweather.requestsToday / metrics.openweather.dailyLimit) * 100 
                  : 0
                } 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">NOAA Requests</span>
                <div className="font-medium">{metrics?.noaa.requestsToday || 0}</div>
              </div>
              <div>
                <span className="text-muted-foreground">NOAA Failures</span>
                <div className={`font-medium ${(metrics?.noaa.failedRequests || 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {metrics?.noaa.failedRequests || 0}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">NOAA Error Rate</span>
                <div className={`font-medium ${
                  metrics?.noaa.requestsToday && metrics.noaa.requestsToday > 0
                    ? (metrics.noaa.failedRequests / metrics.noaa.requestsToday) >= 0.5
                      ? 'text-red-600 dark:text-red-400'
                      : (metrics.noaa.failedRequests / metrics.noaa.requestsToday) >= 0.1
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : ''
                    : ''
                }`}>
                  {metrics?.noaa.requestsToday
                    ? `${Math.round((metrics.noaa.failedRequests / metrics.noaa.requestsToday) * 100)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {/* NOAA freshness indicator */}
            {metrics?.noaa && (
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">
                  NOAA last activity:{' '}
                  {metrics.noaa.idleMinutes === null
                    ? 'no calls today'
                    : metrics.noaa.idleMinutes < 60
                      ? `${metrics.noaa.idleMinutes}m ago`
                      : `${Math.floor(metrics.noaa.idleMinutes / 60)}h ${metrics.noaa.idleMinutes % 60}m ago`}
                </span>
                {metrics.noaa.stale && (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Counter may be stale
                  </span>
                )}
              </div>
            )}

            {metrics?.lastReset && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Reset at {new Date(metrics.lastReset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })} UTC
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Detailed system metrics and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">RSS Memory</span>
              <span className="font-medium">{formatBytes(health?.performance.memoryUsage.rss || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Heap Total</span>
              <span className="font-medium">{formatBytes(health?.performance.memoryUsage.heapTotal || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">External Memory</span>
              <span className="font-medium">{formatBytes(health?.performance.memoryUsage.external || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Rate Limited</span>
              <span className="font-medium">{metrics?.requests.rateLimit || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}