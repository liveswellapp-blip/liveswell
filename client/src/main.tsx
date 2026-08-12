// Sentry MUST be imported before all other modules so it can instrument them.
import { Sentry } from "./sentry";
import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

// In development (Replit preview), use the test key so Clerk initialises on any
// domain. In production, use the live key locked to liveswell.io.
const PUBLISHABLE_KEY = (
  import.meta.env.DEV
    ? import.meta.env.VITE_CLERK_DEV_PUBLISHABLE_KEY
    : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
) as string;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    import.meta.env.DEV
      ? "Missing VITE_CLERK_DEV_PUBLISHABLE_KEY — add the Clerk development publishable key to Replit Secrets."
      : "Missing VITE_CLERK_PUBLISHABLE_KEY — add it to Replit Secrets and restart."
  );
}

const SentryErrorBoundary = Sentry.ErrorBoundary ?? (({ children }: { children: React.ReactNode }) => <>{children}</>);

createRoot(document.getElementById("root")!).render(
  <SentryErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <App />
    </ClerkProvider>
  </SentryErrorBoundary>
);
