/**
 * Sentry client-side initialisation.
 * Imported at the top of client/src/main.tsx before the React tree mounts.
 *
 * Gracefully no-ops when VITE_SENTRY_DSN is absent so the app runs fine in
 * development without a Sentry account.
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Performance monitoring disabled — free tier only
    tracesSampleRate: 0,
    // Capture unhandled promise rejections
    integrations: [Sentry.browserTracingIntegration()],
    // No distributed tracing headers needed (same origin)
    tracePropagationTargets: [],
  });
  console.log("[Sentry] Client monitoring initialised");
} else {
  console.warn(
    "[Sentry] VITE_SENTRY_DSN not set — client error monitoring disabled. " +
      "Add VITE_SENTRY_DSN to Replit Secrets to enable it."
  );
}

export { Sentry };
