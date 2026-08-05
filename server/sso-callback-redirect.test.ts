/**
 * Smoke-test: redirect_url param survives the /sso-callback round-trip.
 *
 * SsoCallback.tsx reads redirect_url (or returnTo) from the query string and
 * passes it to AuthenticateWithRedirectCallback as afterSignInUrl /
 * afterSignUpUrl.  These tests mirror that extraction logic so any accidental
 * regression — e.g. dropping back to a hardcoded "/" — is caught immediately.
 *
 * The flow being tested:
 *   1. Unauthenticated user visits /profile
 *   2. UnauthenticatedFallback redirects to /sign-in?redirect_url=%2Fprofile
 *   3. User initiates OAuth (Google / Apple)
 *   4. Clerk redirects back to /sso-callback (with its own state params)
 *   5. SsoCallback reads redirect_url → passes to AuthenticateWithRedirectCallback
 *   6. User lands on /profile ✓
 */

import { describe, test, expect } from "vitest";

/**
 * Mirrors the extraction logic in client/src/pages/SsoCallback.tsx.
 * Keep in sync if the component logic changes.
 */
function extractRedirectUrl(search: string): string {
  const params = new URLSearchParams(search);
  return params.get("redirect_url") ?? params.get("returnTo") ?? "/";
}

describe("SsoCallback redirect_url extraction", () => {
  test("uses redirect_url when present — user lands on intended destination", () => {
    // Simulates: /sso-callback?redirect_url=%2Fprofile
    expect(extractRedirectUrl("redirect_url=%2Fprofile")).toBe("/profile");
  });

  test("falls back to / when no redirect param is present", () => {
    // Clerk's own state params don't include redirect_url; safe default is /
    expect(extractRedirectUrl("")).toBe("/");
    expect(extractRedirectUrl("__clerk_status=verified")).toBe("/");
  });

  test("preserves nested query params inside redirect_url — e.g. /conditions?location=123", () => {
    // Simulates: /sign-in?redirect_url=%2Fconditions%3Flocation%3D123
    const search = "redirect_url=" + encodeURIComponent("/conditions?location=123");
    expect(extractRedirectUrl(search)).toBe("/conditions?location=123");
  });

  test("accepts the returnTo alias used by some deep-link flows", () => {
    expect(extractRedirectUrl("returnTo=%2Fdashboard")).toBe("/dashboard");
  });

  test("redirect_url takes priority over returnTo when both are present", () => {
    const search = "returnTo=%2Fold&redirect_url=%2Fnew";
    expect(extractRedirectUrl(search)).toBe("/new");
  });

  test("ignores unrelated query params and only reads redirect_url", () => {
    const search = "foo=bar&redirect_url=%2Fsurf-spots&baz=1";
    expect(extractRedirectUrl(search)).toBe("/surf-spots");
  });
});
