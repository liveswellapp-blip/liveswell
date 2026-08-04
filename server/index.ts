import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSurfSpots } from "./storage";
import { NotificationScheduler } from "./notification-scheduler";
import { initWeatherCache } from "./weather-service";
import { runPushHealthCheck, runApnsHealthCheck } from "./push-health-monitor";

// Validate required environment variables for production
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingSecrets = [];
  
  if (isProduction) {
    if (!process.env.SESSION_SECRET) {
      missingSecrets.push('SESSION_SECRET');
    }
    if (!process.env.OPENWEATHER_API_KEY) {
      missingSecrets.push('OPENWEATHER_API_KEY');
    }
  }
  
  if (missingSecrets.length > 0) {
    console.error(`Missing required environment variables: ${missingSecrets.join(', ')}`);
    if (isProduction) {
      console.error('Application cannot start in production without these secrets');
      process.exit(1);
    } else {
      console.warn('Running in development mode with demo data due to missing secrets');
    }
  }
  
  return missingSecrets.length === 0;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Redirect support.liveswell.io → /support so the subdomain works as a
// standalone support URL (e.g. for App Store / Google Play metadata).
//
// Only page-navigation paths are remapped; API calls, static assets, and
// Vite dev-server paths pass through untouched so the app can still load
// its JS/CSS bundles and the contact form can reach its API endpoint.
const SUPPORT_PASSTHROUGH_PREFIXES = ["/api", "/assets", "/_", "/@", "/node_modules"];
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = (req.headers.host || "").split(":")[0].toLowerCase();
  if (host !== "support.liveswell.io") return next();
  if (req.path.startsWith("/support")) return next();
  if (SUPPORT_PASSTHROUGH_PREFIXES.some(p => req.path.startsWith(p))) return next();
  // Use 301 (permanent) — the subdomain-to-path mapping is stable and
  // permanent caching is correct for App Store / Google Play link resolution.
  const suffix = req.path === "/" ? "" : req.path;
  return res.redirect(301, "/support" + suffix);
});

// Session configuration is handled by Replit Auth in replitAuth.ts

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Track errors in monitoring system
      if (res.statusCode >= 400) {
        import('./monitoring').then(({ logError }) => {
          const level = res.statusCode >= 500 ? 'error' : 'warning';
          logError(level, `${res.statusCode} ${req.method} ${path}`, {
            endpoint: path,
            method: req.method,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            context: capturedJsonResponse
          });
        });
      }
    }
  });

  next();
});

(async () => {
  try {
    // Validate environment variables
    validateEnvironment();

    // ── Push notification preflight ──────────────────────────────────────────
    // Run as early as possible — before the scheduler and before any fatal
    // startup step — so a missing/malformed VAPID key after a deploy always
    // triggers an alert email even if something later in startup also fails.
    // push-service.ts is now non-fatal (records init errors instead of
    // throwing), so this check is guaranteed to reach the email send path.
    runPushHealthCheck('startup').catch(err =>
      console.error('[push-health-monitor] Startup preflight failed:', err)
    );

    // ── APNs credential preflight ────────────────────────────────────────────
    // Runs in production only — emails admin when APNs env vars are absent so
    // the broken iOS push experience is caught before users notice.
    runApnsHealthCheck('startup').catch(err =>
      console.error('[push-health-monitor] APNs startup preflight failed:', err)
    );

    // Add some sample error logs for demonstration
    const { logError } = await import('./monitoring');
    logError('info', 'Server startup initiated', { 
      context: { environment: process.env.NODE_ENV || 'development' }
    });
    logError('warning', 'OpenWeather API rate limit approaching', {
      endpoint: '/api/conditions',
      context: { remainingCalls: 850, dailyLimit: 1000 }
    });
    logError('error', 'Database connection timeout during health check', {
      endpoint: '/api/health',
      method: 'GET',
      statusCode: 500,
      context: { timeout: 5000, retries: 3 }
    });
    
    console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
    
    // Initialize surf spots database on startup
    await initializeSurfSpots();

    // Hydrate weather cache from DB (entries fetched before restart are reused)
    await initWeatherCache();
    
    // Initialize notification scheduler
    await NotificationScheduler.initialize();
    
    const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("Error occurred:", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Key configured: ${process.env.OPENWEATHER_API_KEY ? 'Yes' : 'No (using demo data)'}`);
  });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
    process.exit(1);
  }
})();
