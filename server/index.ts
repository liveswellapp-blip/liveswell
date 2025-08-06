import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSurfSpots } from "./storage";

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
    }
  });

  next();
});

(async () => {
  try {
    // Validate environment variables
    validateEnvironment();
    
    console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
    
    // Initialize surf spots database on startup
    await initializeSurfSpots();
    
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
