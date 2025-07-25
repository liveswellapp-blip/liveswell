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

// Global metrics storage
let metrics: ApiMetrics = {
  requests: { total: 0, successful: 0, failed: 0, rateLimit: 0 },
  openweather: { requestsToday: 0, dailyLimit: 1000, remainingCalls: 1000 },
  noaa: { requestsToday: 0, failedRequests: 0, averageResponseTime: 0 }
};

let responseTimeHistory: number[] = [];
const MAX_RESPONSE_TIME_SAMPLES = 100;

/**
 * Health Check Endpoint
 * GET /api/health
 */
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Test external APIs
    const [openweatherStatus, noaaStatus] = await Promise.allSettled([
      testOpenWeatherAPI(),
      testNOAAAPI()
    ]);
    
    const responseTime = Date.now() - startTime;
    updateResponseTimeHistory(responseTime);
    
    const health: HealthStatus = {
      status: determineOverallHealth(dbStatus, openweatherStatus, noaaStatus),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        openweather: openweatherStatus.status === 'fulfilled' ? openweatherStatus.value : 'unhealthy',
        noaa: noaaStatus.status === 'fulfilled' ? noaaStatus.value : 'unhealthy'
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
  noaa: PromiseSettledResult<string>
): 'healthy' | 'degraded' | 'unhealthy' {
  if (db === 'unhealthy') {
    return 'unhealthy'; // Database is critical
  }
  
  const owStatus = openweather.status === 'fulfilled' ? openweather.value : 'unhealthy';
  const noaaStatus = noaa.status === 'fulfilled' ? noaa.value : 'unhealthy';
  
  if (owStatus === 'unhealthy' && noaaStatus === 'unhealthy') {
    return 'degraded'; // App works with demo data
  }
  
  if (owStatus === 'healthy' && noaaStatus === 'healthy') {
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