/**
 * Comprehensive Application Monitoring System
 * Provides health checks, performance metrics, and error tracking
 */

import { Request, Response } from 'express';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    openweather: 'healthy' | 'degraded' | 'unhealthy';
    noaa: 'healthy' | 'degraded' | 'unhealthy';
    pushNotifications: 'healthy' | 'degraded' | 'unhealthy';
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
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

// Error logging interfaces
interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  statusCode?: number;
  context?: any;
}

// Global metrics storage
let metrics: ApiMetrics = {
  requests: { total: 0, successful: 0, failed: 0, rateLimit: 0 },
  openweather: { requestsToday: 0, dailyLimit: 1000, remainingCalls: 1000 },
  noaa: { requestsToday: 0, failedRequests: 0, averageResponseTime: 0 }
};

let responseTimeHistory: number[] = [];
const MAX_RESPONSE_TIME_SAMPLES = 100;

// Error logs storage (in-memory for now, could be moved to database)
let errorLogs: ErrorLog[] = [];
const MAX_ERROR_LOGS = 1000;

/**
 * Health Check Endpoint
 * GET /api/health
 */
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Test external APIs and local services
    const [openweatherStatus, noaaStatus] = await Promise.allSettled([
      testOpenWeatherAPI(),
      testNOAAAPI()
    ]);
    const pushStatus = testPushNotificationService();
    
    const responseTime = Date.now() - startTime;
    updateResponseTimeHistory(responseTime);
    
    const health: HealthStatus = {
      status: determineOverallHealth(dbStatus, openweatherStatus, noaaStatus, pushStatus),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        openweather: openweatherStatus.status === 'fulfilled' ? openweatherStatus.value : 'unhealthy',
        noaa: noaaStatus.status === 'fulfilled' ? noaaStatus.value : 'unhealthy',
        pushNotifications: pushStatus
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        responseTime,
        activeConnections: getActiveConnections()
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure'
    });
  }
}

/**
 * Metrics Endpoint
 * GET /api/metrics
 */
export function getMetrics(req: Request, res: Response) {
  const averageResponseTime = responseTimeHistory.length > 0 
    ? responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length 
    : 0;

  res.json({
    ...metrics,
    performance: {
      averageResponseTime: Math.round(averageResponseTime),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage()
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Simple database ping - this would need to be adapted based on your database setup
    const { storage } = await import('./storage');
    await storage.getAllLocations();
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Test OpenWeather API
 */
async function testOpenWeatherAPI(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return 'degraded'; // App works with demo data
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return 'healthy';
    } else if (response.status === 429) {
      metrics.requests.rateLimit++;
      return 'degraded'; // Rate limited but functional
    } else {
      return 'unhealthy';
    }
  } catch (error) {
    console.error('OpenWeather API health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Test Push Notification service (VAPID key presence and format)
 */
function testPushNotificationService(): 'healthy' | 'degraded' | 'unhealthy' {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.error('[ERROR] Push notification health check failed: VAPID keys not configured');
    return 'unhealthy';
  }

  // VAPID public keys are URL-safe base64 encoded; typical length is 87–88 chars
  const looksValid = publicKey.length > 50 && /^[A-Za-z0-9\-_]+=*$/.test(publicKey);
  if (!looksValid) {
    console.error('[ERROR] Push notification health check failed: VAPID_PUBLIC_KEY appears malformed');
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Test NOAA API
 */
async function testNOAAAPI(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      'https://www.ndbc.noaa.gov/activestations.xml',
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    return response.ok ? 'healthy' : 'degraded';
  } catch (error) {
    console.error('NOAA API health check failed:', error);
    return 'degraded'; // NOAA issues don't break core functionality
  }
}

/**
 * Determine overall system health
 */
function determineOverallHealth(
  db: string,
  openweather: PromiseSettledResult<string>,
  noaa: PromiseSettledResult<string>,
  push: string
): 'healthy' | 'degraded' | 'unhealthy' {
  if (db === 'unhealthy') {
    return 'unhealthy'; // Database is critical
  }

  if (push === 'unhealthy') {
    return 'unhealthy'; // Push notifications are critical for user alerts
  }

  const owStatus = openweather.status === 'fulfilled' ? openweather.value : 'unhealthy';
  const noaaStatus = noaa.status === 'fulfilled' ? noaa.value : 'unhealthy';
  
  if (owStatus === 'unhealthy' && noaaStatus === 'unhealthy') {
    return 'degraded'; // App works with demo data
  }
  
  if (owStatus === 'healthy' && noaaStatus === 'healthy' && push === 'healthy') {
    return 'healthy';
  }
  
  return 'degraded';
}

/**
 * Track API request metrics
 */
export function trackRequest(success: boolean, source: 'openweather' | 'noaa' | 'general' = 'general') {
  metrics.requests.total++;
  
  if (success) {
    metrics.requests.successful++;
  } else {
    metrics.requests.failed++;
  }
  
  if (source === 'openweather') {
    metrics.openweather.requestsToday++;
  } else if (source === 'noaa') {
    metrics.noaa.requestsToday++;
  }
}

/**
 * Track response times
 */
function updateResponseTimeHistory(responseTime: number) {
  responseTimeHistory.push(responseTime);
  if (responseTimeHistory.length > MAX_RESPONSE_TIME_SAMPLES) {
    responseTimeHistory.shift();
  }
}

/**
 * Get active connections count (simplified)
 */
function getActiveConnections(): number {
  // This is a simplified version - in production you'd track actual connections
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Error tracking middleware
 */
export function errorTrackingMiddleware(error: Error, req: Request, res: Response, next: any) {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };
  
  console.error('Application Error:', errorDetails);
  
  // Track error in metrics
  metrics.requests.failed++;
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({ message: error.message, stack: error.stack });
  }
}

/**
 * Reset daily metrics (call this daily via cron or scheduler)
 */
export function resetDailyMetrics() {
  metrics.openweather.requestsToday = 0;
  metrics.noaa.requestsToday = 0;
  metrics.noaa.failedRequests = 0;
  
  console.log('Daily metrics reset completed');
}

/**
 * Log application errors
 */
export function logError(
  level: 'error' | 'warning' | 'info',
  message: string,
  options: {
    stack?: string;
    endpoint?: string;
    method?: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
    statusCode?: number;
    context?: any;
  } = {}
) {
  const errorLog: ErrorLog = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    ...options
  };

  errorLogs.unshift(errorLog); // Add to beginning
  
  // Trim logs if too many
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs = errorLogs.slice(0, MAX_ERROR_LOGS);
  }

  // Also log to console for debugging
  const logLevel = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
  logLevel(`[${level.toUpperCase()}] ${message}`, options.context ? options.context : '');
}

/**
 * Get error logs with filtering
 */
export function getErrorLogs(
  level?: 'error' | 'warning' | 'info',
  limit: number = 100,
  offset: number = 0
): { logs: ErrorLog[], total: number } {
  let filteredLogs = errorLogs;
  
  if (level) {
    filteredLogs = errorLogs.filter(log => log.level === level);
  }
  
  return {
    logs: filteredLogs.slice(offset, offset + limit),
    total: filteredLogs.length
  };
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  byLevel: Record<string, number>;
  last24Hours: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
} {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const byLevel = errorLogs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const last24Hours = errorLogs.filter(log => 
    new Date(log.timestamp) > yesterday
  ).length;
  
  const endpointCounts = errorLogs.reduce((acc, log) => {
    if (log.endpoint) {
      acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const topEndpoints = Object.entries(endpointCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([endpoint, count]) => ({ endpoint, count }));
  
  return {
    total: errorLogs.length,
    byLevel,
    last24Hours,
    topEndpoints
  };
}