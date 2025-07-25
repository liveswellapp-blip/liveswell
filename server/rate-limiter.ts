/**
 * Rate Limiting Middleware
 * Protects against API abuse and manages external service calls
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Generic rate limiter middleware
 */
export function createRateLimit(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
    
    // Initialize or increment counter
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      rateLimitStore[key].count++;
    }
    
    const { count, resetTime } = rateLimitStore[key];
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    });
    
    if (count > maxRequests) {
      return res.status(429).json({
        error: message,
        resetTime: new Date(resetTime).toISOString()
      });
    }
    
    next();
  };
}

/**
 * API-specific rate limiters
 */

// General API rate limiter - 100 requests per minute
export const generalApiLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many API requests, please try again in a minute'
});

// Weather data rate limiter - 10 requests per minute per IP
export const weatherApiLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Weather data requests limited to 10 per minute',
  keyGenerator: (req: Request) => `weather:${req.ip}`
});

// Search rate limiter - 30 requests per minute
export const searchApiLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Search requests limited to 30 per minute'
});

// NOAA data rate limiter - 20 requests per minute
export const noaaApiLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'NOAA data requests limited to 20 per minute'
});

/**
 * OpenWeather API usage tracker
 */
class OpenWeatherTracker {
  private dailyCount = 0;
  private lastResetDate = new Date().toDateString();
  private readonly dailyLimit = 1000; // Adjust based on your plan

  incrementUsage() {
    const today = new Date().toDateString();
    
    if (today !== this.lastResetDate) {
      this.dailyCount = 0;
      this.lastResetDate = today;
    }
    
    this.dailyCount++;
  }

  getRemainingCalls(): number {
    return Math.max(0, this.dailyLimit - this.dailyCount);
  }

  isLimitExceeded(): boolean {
    return this.dailyCount >= this.dailyLimit;
  }

  getUsageStats() {
    return {
      used: this.dailyCount,
      remaining: this.getRemainingCalls(),
      limit: this.dailyLimit,
      resetDate: this.lastResetDate
    };
  }
}

export const openWeatherTracker = new OpenWeatherTracker();

/**
 * Middleware to track OpenWeather API usage
 */
export function trackOpenWeatherUsage(req: Request, res: Response, next: NextFunction) {
  // Only track if we're making an actual OpenWeather API call
  if (process.env.OPENWEATHER_API_KEY) {
    openWeatherTracker.incrementUsage();
    
    if (openWeatherTracker.isLimitExceeded()) {
      console.warn('OpenWeather API daily limit exceeded, switching to demo data');
    }
  }
  
  next();
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const expiredKeys = Object.keys(rateLimitStore).filter(
    key => rateLimitStore[key].resetTime < now
  );
  
  expiredKeys.forEach(key => delete rateLimitStore[key]);
  
  if (expiredKeys.length > 0) {
    console.log(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes