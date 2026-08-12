/**
 * Sentry server-side initialisation.
 * Must be imported at the very top of server/index.ts, before any other imports,
 * so Sentry can instrument all modules automatically.
 *
 * Gracefully no-ops when SENTRY_DSN is absent so the app runs fine in
 * development without a Sentry account.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Performance monitoring disabled — free tier only
    tracesSampleRate: 0,
    // Attach user ID to events when available
    initialScope: {
      tags: { component: "server" },
    },
  });
  console.log("[Sentry] Server monitoring initialised");
} else {
  console.warn(
    "[Sentry] SENTRY_DSN not set — server error monitoring disabled. " +
      "Add SENTRY_DSN to Replit Secrets to enable it."
  );
}

export { Sentry };
