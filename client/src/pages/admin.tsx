import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Activity, Database, Globe, BarChart3,
  AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp,
  Bell, LayoutDashboard, Users, Bug, MessageSquare,
} from "lucide-react";
import AdminNav, { AdminSection } from "@/components/AdminNav";
import UserDatabase from "@/components/UserDatabase";
import ErrorLogs from "@/components/ErrorLogs";
import SurfSpotsMonitoring from "@/components/SurfSpotsMonitoring";
import LiveAlertTest from "@/components/LiveAlertTest";

type AdminView = AdminSection;

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
    memoryUsage: { rss: number; heapUsed: number; heapTotal: number; external: number };
    responseTime: number;
    activeConnections: number;
  };
}

interface ApiMetrics {
  requests: { total: number; successful: number; failed: number; rateLimit: number };
  openweather: { requestsToday: number; dailyLimit: number; remainingCalls: number; lastError?: string };
  noaa: { requestsToday: number; failedRequests: number; averageResponseTime: number };
  pushNotifications: { sentToday: number; failedToday: number; cleanedUpToday: number };
}

interface UsageForecast {
  uniqueLocations: number;
  cyclesPerDay: number;
  checksPerDay?: number; // alias kept for backward compat
  owmCallsPerCycle: number;
  callsPerLocationPerDay: number;
  estimatedCallsPerDay: number;
  dailyLimit: number;
  remainingQuota: number;
  capacityRemaining: number | null;
  utilizationPct: number;
  quotaExceededAt: string | null;
  planUpgradeUrl?: string;
  planNote?: string;
}

/** Fetches and displays the Sentry "Errors (last 24h)" count. */
function SentryErrorCount() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<{
    configured: boolean;
    count: number | null;
    capped: boolean;
    sentryUrl: string | null;
    cachedAt: string | null;
    message?: string;
  }>({
    queryKey: ['/api/admin/sentry-error-count'],
    refetchInterval: 5 * 60 * 1000, // re-poll every 5 min (matches server cache TTL)
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-pulse" />
        Loading error count…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        Could not load error count.
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="rounded-md bg-secondary p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span>Errors (last 24h): <em>not configured</em></span>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.message ?? 'Set SENTRY_API_TOKEN, SENTRY_ORG, and SENTRY_PROJECT in Replit Secrets to enable live error counts.'}
        </p>
      </div>
    );
  }

  if (data.count === null) {
    return (
      <div className="rounded-md bg-secondary p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>Errors (last 24h): <em>fetch failed</em></span>
        </div>
        <p className="text-xs text-muted-foreground">{data.message}</p>
      </div>
    );
  }

  const hasErrors = data.count > 0;
  const countLabel = data.capped ? '100+' : String(data.count);

  return (
    <div className={`rounded-md p-3 space-y-2 ${hasErrors ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'}`}>
      <div className="flex items-center gap-2">
        {hasErrors
          ? <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          : <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />}
        <span className={`font-semibold text-sm ${hasErrors ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}>
          Errors (last 24h):&nbsp;
          <span className={`text-lg ${hasErrors ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
            {countLabel}
          </span>
          {!hasErrors && ' — all clear'}
        </span>
        {hasErrors && data.sentryUrl && (
          <a
            href={data.sentryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs underline text-amber-700 dark:text-amber-300 whitespace-nowrap"
          >
            View in Sentry →
          </a>
        )}
      </div>
      {hasErrors && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {data.capped ? '100 or more new unresolved issues ' : `${data.count} new unresolved issue${data.count !== 1 ? 's' : ''} `}
          first seen in the last 24 hours.{' '}
          {data.sentryUrl && (
            <a href={data.sentryUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Open Sentry dashboard
            </a>
          )}{' '}to investigate.
        </p>
      )}
      {data.cachedAt && (
        <p className="text-xs text-muted-foreground">
          Cached · refreshes every 5 min · last fetched {new Date(data.cachedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}

/** Inline panel: shows Sentry DSN status and a one-click smoke-test button. */
function SentryTestPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'unconfigured' | 'error'>('idle');

  async function sendTestError() {
    setStatus('sending');
    try {
      // The endpoint deliberately throws through Express's error handler and
      // returns HTTP 500 — that IS the success signal for the smoke test.
      const res = await fetch('/api/admin/sentry-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 503) {
        setStatus('unconfigured');
        toast({ title: 'Sentry not configured', description: 'Add SENTRY_DSN to Replit Secrets to enable monitoring.', variant: 'destructive' });
        return;
      }

      // 500 is expected — it means the error travelled through Express's error
      // handler chain (where Sentry captures it) and the generic handler replied.
      // Any non-503 response means the test fired successfully.
      setStatus('sent');
      toast({
        title: 'Test error sent to Sentry',
        description: 'Check your Sentry dashboard — the event should appear within 30 seconds.',
      });
    } catch {
      setStatus('error');
      toast({ title: 'Request failed', description: 'Could not reach the server.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {status === 'sent'
          ? <CheckCircle className="h-5 w-5 text-green-500" />
          : status === 'unconfigured'
            ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
            : status === 'error'
              ? <XCircle className="h-5 w-5 text-red-500" />
              : <Activity className="h-5 w-5 text-muted-foreground" />}
        <span className="text-sm">
          {status === 'idle'     && 'Send a deliberate test error to confirm Sentry is receiving events.'}
          {status === 'sending'  && 'Sending test error…'}
          {status === 'sent'     && 'Test error delivered — check Sentry dashboard (Events → Issues).'}
          {status === 'unconfigured' && 'SENTRY_DSN is not set. Add it to Replit Secrets to enable monitoring.'}
          {status === 'error'    && 'Request failed. Make sure the server is running.'}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={status === 'sending'}
        onClick={sendTestError}
      >
        <Bug className="h-4 w-4 mr-2" />
        {status === 'sending' ? 'Sending…' : 'Send Test Error to Sentry'}
      </Button>
      <p className="text-xs text-muted-foreground">
        This fires a deliberate exception through Express's error handler — the same path as a real crash.
        The event will carry the admin session context. Errors also require <code>SENTRY_DSN</code> to be set.
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [location] = useLocation();
  const { toast } = useToast();

  // Check for an existing valid session cookie on mount so the admin
  // doesn't have to log in again after a page refresh.
  useEffect(() => {
    fetch('/api/admin/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) setIsAuthenticated(true);
      })
      .catch(() => {/* ignore network errors — fall through to login form */})
      .finally(() => setSessionChecked(true));
  }, []);

  // Read ?view= query param so links from other pages (e.g. user detail back button) land on the right section
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as AdminView | null;
    if (view && ['dashboard','alerts','users','errors','surfspots'].includes(view)) {
      setActiveView(view);
    }
  }, [location]);

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
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    },
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<ApiMetrics>({
    queryKey: ['/api/metrics'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: forecastData } = useQuery<UsageForecast>({
    queryKey: ['/api/admin/usage-forecast'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: apnsHealth, isLoading: apnsLoading } = useQuery<{
    operational: boolean;
    error: string | null;
  }>({
    queryKey: ['/api/push/apns-health'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: twilioStatus, isLoading: twilioStatusLoading } = useQuery<{
    configured: boolean;
    senderMode: 'messaging-service' | 'phone-number' | 'unconfigured';
    senderValue: string | null;
    maskedAccountSid: string | null;
  }>({
    queryKey: ['/api/admin/twilio-status'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
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
      case 'healthy':   return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':  return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />;
      default:          return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // ── Session check in progress — show nothing until resolved ──────────────
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-sm opacity-70">Checking session…</div>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
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


  // ── Page title bar ────────────────────────────────────────────────────────
  const pageTitle: Record<AdminView, string> = {
    dashboard: 'Dashboard',
    alerts:    'Alert Testing',
    users:     'User Database',
    errors:    'Error Logs',
    surfspots: 'Surf Spots Monitoring',
  };

  // ── Main content views ────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeView) {
      case 'users':
        return <UserDatabase onClose={() => setActiveView('dashboard')} />;
      case 'errors':
        return <ErrorLogs onClose={() => setActiveView('dashboard')} />;
      case 'surfspots':
        return <SurfSpotsMonitoring onClose={() => setActiveView('dashboard')} />;
      case 'alerts':
        return (
          <div className="space-y-6">
            <LiveAlertTest />
          </div>
        );
      default:
        return <DashboardHome />;
    }
  };

  // ── Dashboard home ────────────────────────────────────────────────────────
  const DashboardHome = () => (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Services + API Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {[
                  { label: 'Database',       key: 'database'    },
                  { label: 'OpenWeather API', key: 'openweather' },
                  { label: 'NOAA Data',       key: 'noaa'        },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon((healthData.services as any)[key])}
                      <span className="capitalize">{(healthData.services as any)[key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p>Loading services status...</p>}
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
                      style={{ width: `${(metricsData.openweather.requestsToday / metricsData.openweather.dailyLimit) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm space-y-2">
                  <p><strong>NOAA Requests:</strong> {metricsData.noaa.requestsToday}</p>
                  <p><strong>Failed Requests:</strong> {metricsData.requests.failed}</p>
                  <p><strong>Rate Limited:</strong> {metricsData.requests.rateLimit}</p>
                </div>
              </div>
            ) : <p>Loading API metrics...</p>}
          </CardContent>
        </Card>
      </div>

      {/* Push Notification Delivery Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Push Notification Delivery (Today)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsData ? (() => {
            const push = metricsData.pushNotifications ?? { sentToday: 0, failedToday: 0, cleanedUpToday: 0 };
            const total = push.sentToday + push.failedToday;
            const successRate = total > 0 ? Math.round((push.sentToday / total) * 100) : null;
            const hasFailures = push.failedToday > 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{push.sentToday}</div>
                    <div className="text-xs text-muted-foreground mt-1">Delivered</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${hasFailures ? 'bg-red-100 dark:bg-red-900/30' : 'bg-secondary'}`}>
                    <div className={`text-2xl font-bold ${hasFailures ? 'text-red-600' : ''}`}>{push.failedToday}</div>
                    <div className="text-xs text-muted-foreground mt-1">Failed (transient)</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{push.cleanedUpToday}</div>
                    <div className="text-xs text-muted-foreground mt-1">Cleaned up (expired)</div>
                  </div>
                </div>
                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Delivery success rate</span>
                      <span>{successRate}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${successRate !== null && successRate < 70 ? 'bg-red-500' : successRate !== null && successRate < 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${successRate ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Counts reset at midnight UTC. "Cleaned up" means the subscription was expired or invalid and has been removed.
                </p>
              </div>
            );
          })() : <p className="text-sm text-muted-foreground">Loading push metrics...</p>}
        </CardContent>
      </Card>

      {/* APNs (iOS Push) Credential Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>iOS Push Notifications (APNs)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apnsLoading ? (
            <p className="text-sm text-muted-foreground">Loading APNs status…</p>
          ) : apnsHealth ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {apnsHealth.operational
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                <span className="font-medium">
                  {apnsHealth.operational ? 'Operational — credentials configured' : 'Disabled — credentials not configured'}
                </span>
              </div>
              {!apnsHealth.operational && apnsHealth.error && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                  <p><strong>Error:</strong> {apnsHealth.error}</p>
                  <p className="font-semibold mt-2">How to enable iOS push:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to <a href="https://developer.apple.com" target="_blank" rel="noopener noreferrer" className="underline">developer.apple.com</a> → <em>Certificates, Identifiers &amp; Profiles</em> → <em>Keys</em>.</li>
                    <li>Create (or download) an APNs key — download the <code>.p8</code> file.</li>
                    <li>Copy the full <code>.p8</code> file contents (including the <code>-----BEGIN PRIVATE KEY-----</code> header) and set it as the <strong>APNS_KEY</strong> secret in Replit Secrets.</li>
                    <li>Set <strong>APNS_KEY_ID</strong> to the 10-character Key ID shown on the portal.</li>
                    <li>Set <strong>APNS_TEAM_ID</strong> to the 10-character Team ID from your Apple Developer account.</li>
                    <li>Optionally set <strong>APNS_BUNDLE_ID</strong> (defaults to <code>com.liveswell.app</code>) and <strong>APNS_SANDBOX=true</strong> for TestFlight builds.</li>
                    <li>Redeploy the application — the service initialises at startup.</li>
                  </ol>
                </div>
              )}
              {apnsHealth.operational && (
                <p className="text-xs text-muted-foreground">
                  APNS_KEY, APNS_KEY_ID, and APNS_TEAM_ID are all set. Native iOS push alerts are active.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">APNs status unavailable.</p>
          )}
        </CardContent>
      </Card>

      {/* Twilio SMS Sender Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>SMS Sender (Twilio)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {twilioStatusLoading ? (
            <p className="text-sm text-muted-foreground">Loading Twilio status…</p>
          ) : twilioStatus ? (
            <div className="space-y-3">
              {/* Overall configured status */}
              <div className="flex items-center gap-2">
                {twilioStatus.configured
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-red-500" />}
                <span className="font-medium">
                  {twilioStatus.configured ? 'Configured' : 'Not configured — SMS disabled'}
                </span>
              </div>

              {twilioStatus.configured && (
                <div className="space-y-2 text-sm">
                  {/* Sender mode */}
                  <div className="flex items-start gap-2">
                    {twilioStatus.senderMode === 'messaging-service'
                      ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                    <div>
                      <span className="font-medium">
                        {twilioStatus.senderMode === 'messaging-service'
                          ? 'Routing via Messaging Service SID'
                          : 'Routing via direct phone number (fallback)'}
                      </span>
                      {twilioStatus.senderValue && (
                        <p className="text-muted-foreground font-mono text-xs mt-0.5">
                          {twilioStatus.senderValue}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Account SID */}
                  {twilioStatus.maskedAccountSid && (
                    <p className="text-muted-foreground text-xs">
                      Account SID: <span className="font-mono">{twilioStatus.maskedAccountSid}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Warning when in fallback mode */}
              {twilioStatus.senderMode === 'phone-number' && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-3 text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  <p><strong>Fallback mode — A2P 10DLC not active.</strong></p>
                  <p>Messages are sent from the raw phone number rather than a registered Messaging Service. US carriers may filter or block these messages.</p>
                  <p className="text-xs mt-1">Set the <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">TWILIO_MESSAGING_SERVICE_SID</code> secret to enable A2P 10DLC routing.</p>
                </div>
              )}

              {/* Not configured at all */}
              {twilioStatus.senderMode === 'unconfigured' && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 text-sm text-red-800 dark:text-red-200">
                  <p>Neither <code className="bg-red-100 dark:bg-red-800 px-1 rounded">TWILIO_MESSAGING_SERVICE_SID</code> nor <code className="bg-red-100 dark:bg-red-800 px-1 rounded">TWILIO_PHONE_NUMBER</code> is set. SMS cannot be sent.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Twilio status unavailable.</p>
          )}
        </CardContent>
      </Card>

      {/* Sentry Error Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Error Monitoring (Sentry)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SentryErrorCount />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Smoke Test</p>
            <SentryTestPanel />
          </div>
        </CardContent>
      </Card>

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
              {/* Quota-exceeded banner — shown when a real 429 was received today */}
              {forecastData.quotaExceededAt && (
                <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <strong>OpenWeather daily quota exceeded</strong> — a 429 response was received at{' '}
                    {new Date(forecastData.quotaExceededAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                    {' '}Condition alerts are <strong>paused</strong> until midnight UTC when the quota resets.
                    Users will not receive false alerts based on fabricated demo data.
                    {' '}<a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="underline font-medium">Upgrade the plan</a> to avoid this tomorrow.
                  </div>
                </div>
              )}
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
              <div className={`rounded-md p-3 text-sm ${forecastData.remainingQuota <= 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : forecastData.utilizationPct >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'}`}>
                {forecastData.remainingQuota <= 0 ? (
                  <p>⚠️ <strong>Over the daily cap.</strong> At {forecastData.uniqueLocations} monitored location{forecastData.uniqueLocations !== 1 ? 's' : ''}, the estimated {forecastData.estimatedCallsPerDay.toLocaleString()} calls/day exceeds the {forecastData.dailyLimit.toLocaleString()} free-tier limit.{' '}
                    <a href={forecastData.planUpgradeUrl ?? 'https://openweathermap.org/api'} target="_blank" rel="noopener noreferrer" className="underline font-medium">Upgrade the plan</a> to raise your quota.
                  </p>
                ) : forecastData.utilizationPct >= 80 ? (
                  <p>⚠️ <strong>Approaching the daily cap ({forecastData.utilizationPct}% used).</strong> You have room for roughly {forecastData.capacityRemaining ?? 0} more monitored location{(forecastData.capacityRemaining ?? 0) !== 1 ? 's' : ''} before hitting the limit.{' '}
                    <a href={forecastData.planUpgradeUrl ?? 'https://openweathermap.org/api'} target="_blank" rel="noopener noreferrer" className="underline font-medium">Upgrade the plan</a> to increase your quota.
                  </p>
                ) : forecastData.uniqueLocations === 0 ? (
                  <p>✅ <strong>No locations monitored yet.</strong> The {forecastData.dailyLimit.toLocaleString()} daily call quota is fully available.</p>
                ) : (
                  <p>✅ <strong>Well within limits.</strong> {forecastData.uniqueLocations} location{forecastData.uniqueLocations !== 1 ? 's' : ''} × {forecastData.cyclesPerDay} cycles/day = {forecastData.estimatedCallsPerDay.toLocaleString()} calls. You can add {forecastData.capacityRemaining ?? 0} more location{(forecastData.capacityRemaining ?? 0) !== 1 ? 's' : ''} before reaching the cap.</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Checks run every 20 min ({forecastData.cyclesPerDay} cycles/day). Estimate resets at midnight UTC.
              </p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Loading forecast...</p>}
        </CardContent>
      </Card>

      {/* Quick-jump cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Quick Access</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {([ 
              { id: 'alerts'    as AdminView, label: 'Alert Testing',   icon: <Bell className="h-5 w-5" />          },
              { id: 'users'     as AdminView, label: 'User Database',   icon: <Users className="h-5 w-5" />         },
              { id: 'errors'    as AdminView, label: 'Error Logs',      icon: <AlertTriangle className="h-5 w-5" /> },
              { id: 'surfspots' as AdminView, label: 'Surf Spots',      icon: <Globe className="h-5 w-5" />         },
            ]).map(item => (
              <Button
                key={item.id}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => setActiveView(item.id)}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <div className="text-left">
                    <div className="font-semibold">{item.label}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Layout wrapper ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        activeSection={activeView}
        onSectionChange={setActiveView}
        onLogout={() => {
          fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
            .catch(() => {/* ignore — clear client state regardless */})
            .finally(() => setIsAuthenticated(false));
        }}
      />

      {/* Main content — offset right on desktop to clear sidebar */}
      <div className="md:pl-60 pb-24 md:pb-6">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{pageTitle[activeView]}</h1>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
