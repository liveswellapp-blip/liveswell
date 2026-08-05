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
 *
 * ── Clerk SDK upgrade checklist ──────────────────────────────────────────────
 * This component was written for @clerk/clerk-react ^5.x (tested on 5.61.9).
 * Clerk has historically renamed props across major versions, e.g.:
 *   - afterSignInUrl / afterSignUpUrl were introduced in v5
 *   - The `routing` prop requirement changed across v4 → v5
 *
 * BEFORE merging any @clerk/clerk-react major-version bump:
 *   1. Run `npm test` — the `sso-callback-compat.test.ts` guard will fail
 *      immediately if the major version or the export changes.
 *   2. Smoke-test /sso-callback with a real Google or Apple sign-in.
 *   3. Update the version assertions in `client/src/sso-callback-compat.test.ts`
 *      once the new props are confirmed working.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function SsoCallback() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/"
      afterSignUpUrl="/"
    />
  );
}
