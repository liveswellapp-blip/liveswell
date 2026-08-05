import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

/**
 * Dedicated OAuth callback handler.
 *
 * After any OAuth flow (Google, Apple, email magic link), Clerk redirects
 * the browser to /sso-callback.  This component processes the handshake,
 * waits for the session to be fully established, and then forwards the user
 * to the final destination (/ by default, or wherever redirect_url points).
 *
 * Without this dedicated route, the session handshake has no mounted Clerk
 * component to complete it, so clerkUser stays null and the app falls back
 * to the landing page — the redirect loop users were seeing.
 */
export default function SsoCallback() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/"
      afterSignUpUrl="/"
    />
  );
}
