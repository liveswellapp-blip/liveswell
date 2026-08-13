/**
 * sentry-alert-logic.ts
 *
 * Pure, stateful spike-detection logic for the Sentry error-count alert.
 * Extracted from the /api/admin/sentry-error-count route so it can be
 * unit-tested independently of Express, authentication, and the Resend
 * connector.
 *
 * State is held in this module's singleton — it persists across route
 * handler invocations exactly as the inline closure did, but can now be
 * reset between tests via resetForTesting().
 */

export interface SentryCache {
  count: number;
  capped: boolean;
  fetchedAt: number;
}

// ── Module-level singleton state ────────────────────────────────────────────
let _sentryCache: SentryCache | null = null;
let _sentryAlertedAt: number | null = null; // timestamp of last alert sent during current spike

export const SENTRY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Accessors (for routes.ts) ───────────────────────────────────────────────

export function getSentryCache(): SentryCache | null {
  return _sentryCache;
}

export function setSentryCache(cache: SentryCache): void {
  _sentryCache = cache;
}

export function getSentryAlertedAt(): number | null {
  return _sentryAlertedAt;
}

// ── Core logic ──────────────────────────────────────────────────────────────

/**
 * Evaluates whether a Sentry error-spike email should be fired after a fresh
 * count is fetched.  Updates the internal sentinel state as a side-effect.
 *
 * Returns `true` when the caller should dispatch the alert email, `false`
 * otherwise.
 *
 * Rules:
 *  • Fire when count ≥ threshold AND it rose from below threshold AND no
 *    alert has been sent yet during this spike (_sentryAlertedAt is null).
 *  • Suppress on subsequent polls that are still above threshold
 *    (_sentryAlertedAt is already set).
 *  • Reset sentinel (_sentryAlertedAt → null) once count drops below
 *    threshold so the NEXT spike triggers a fresh email.
 *
 * @param count          Newly fetched unresolved Sentry issue count
 * @param previousCount  Count from the previous cache entry (0 when no cache)
 * @param threshold      Minimum count that constitutes a spike (≥ 1)
 * @param now            Current epoch milliseconds (injectable for testing)
 */
export function processSentryCount(
  count: number,
  previousCount: number,
  threshold: number,
  now: number,
): boolean {
  let shouldAlert = false;

  if (count >= threshold && previousCount < threshold) {
    // Count just crossed the threshold — fire unless already alerted this spike
    if (!_sentryAlertedAt) {
      _sentryAlertedAt = now;
      shouldAlert = true;
    }
  }

  // Reset sentinel when count falls back below threshold so the next spike
  // triggers a fresh email.
  if (count < threshold) {
    _sentryAlertedAt = null;
  }

  return shouldAlert;
}

// ── Test helper ─────────────────────────────────────────────────────────────

/**
 * Resets all module-level state.  Call this in beforeEach / afterEach so tests
 * are fully isolated from each other.
 */
export function resetForTesting(): void {
  _sentryCache = null;
  _sentryAlertedAt = null;
}
