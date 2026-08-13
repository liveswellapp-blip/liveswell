/**
 * sentry-alert.test.ts
 *
 * Verifies the Sentry error-spike alert logic in sentry-alert-logic.ts:
 *
 *   1. Email fires on the first poll that crosses the threshold.
 *   2. Email does NOT fire again on subsequent polls while still above threshold.
 *   3. Sentinel resets when count drops below threshold; the next spike fires a
 *      fresh email.
 *   4. No email is sent when count is below threshold.
 *   5. Custom SENTRY_ALERT_THRESHOLD is respected.
 *   6. processSentryCount() is idempotent when the count stays above threshold
 *      across many polls.
 *
 * All dependencies (EmailService, fetch) are mocked — no network or DB access.
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock EmailService before any module under test is imported so the spy is in
// place when sentry-alert-logic imports nothing (it's pure), and when the
// routes layer calls EmailService.sendSentryErrorAlert.
// ---------------------------------------------------------------------------
vi.mock('./email-service', () => ({
  EmailService: {
    sendSentryErrorAlert: vi.fn().mockResolvedValue(true),
  },
}));

import { EmailService } from './email-service';
import {
  processSentryCount,
  resetForTesting,
  getSentryAlertedAt,
} from './sentry-alert-logic';

// Convenience alias
const sendAlert = vi.mocked(EmailService.sendSentryErrorAlert);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THRESHOLD = 5;
const NOW = 1_700_000_000_000;

/** Simulates the routes.ts call site for a single poll cycle. */
function runPoll(params: {
  count: number;
  previousCount: number;
  threshold?: number;
  now?: number;
}): boolean {
  return processSentryCount(
    params.count,
    params.previousCount,
    params.threshold ?? THRESHOLD,
    params.now ?? NOW,
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('processSentryCount — Sentry error-spike alert logic', () => {
  beforeEach(() => {
    resetForTesting();
    sendAlert.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  it('returns true (should alert) on the first poll that crosses the threshold', () => {
    const result = runPoll({ count: 5, previousCount: 0 });

    expect(result).toBe(true);
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  it('records the alert timestamp after the first spike', () => {
    runPoll({ count: 5, previousCount: 0, now: NOW });

    expect(getSentryAlertedAt()).toBe(NOW);
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  it('returns false on a second poll while count is still above threshold (no re-alert)', () => {
    // First poll — spike detected
    runPoll({ count: 5, previousCount: 0 });

    // Second poll — same count, alert should NOT fire again
    const result = runPoll({ count: 7, previousCount: 5 });

    expect(result).toBe(false);
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  it('continues suppressing the alert across many polls at elevated count', () => {
    runPoll({ count: 5, previousCount: 0 });

    for (let i = 0; i < 10; i++) {
      const result = runPoll({ count: 5 + i, previousCount: 4 + i });
      expect(result).toBe(false);
    }
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  it('resets the sentinel when count drops back below threshold', () => {
    // Spike up
    runPoll({ count: 5, previousCount: 0 });
    expect(getSentryAlertedAt()).not.toBeNull();

    // Count drops below threshold
    runPoll({ count: 2, previousCount: 5 });

    // Sentinel must be reset
    expect(getSentryAlertedAt()).toBeNull();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  it('fires a fresh alert after the count recovers and then spikes again', () => {
    // First spike
    const first = runPoll({ count: 5, previousCount: 0 });
    expect(first).toBe(true);

    // Recovery — count drops below threshold
    runPoll({ count: 2, previousCount: 5 });

    // Second spike — should alert again
    const second = runPoll({ count: 8, previousCount: 2 });
    expect(second).toBe(true);
  });

  // ── Test 7 ─────────────────────────────────────────────────────────────────
  it('returns false when count is below threshold (no spike)', () => {
    const result = runPoll({ count: 2, previousCount: 0 });

    expect(result).toBe(false);
    expect(getSentryAlertedAt()).toBeNull();
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────────
  it('returns false when count equals threshold minus one', () => {
    const result = runPoll({ count: THRESHOLD - 1, previousCount: 0 });

    expect(result).toBe(false);
  });

  // ── Test 9 ─────────────────────────────────────────────────────────────────
  it('fires when count exactly equals threshold', () => {
    const result = runPoll({ count: THRESHOLD, previousCount: 0 });

    expect(result).toBe(true);
  });

  // ── Test 10 ────────────────────────────────────────────────────────────────
  it('respects a custom threshold — does not fire below it', () => {
    // With threshold=10, a count of 5 should NOT trigger an alert
    const result = runPoll({ count: 5, previousCount: 0, threshold: 10 });

    expect(result).toBe(false);
  });

  // ── Test 11 ────────────────────────────────────────────────────────────────
  it('respects a custom threshold — fires at or above it', () => {
    const result = runPoll({ count: 10, previousCount: 0, threshold: 10 });

    expect(result).toBe(true);
  });

  // ── Test 12 ────────────────────────────────────────────────────────────────
  it('returns false when count was already above threshold before this poll (no new crossing)', () => {
    // previousCount is already at or above threshold — this is not a crossing event
    const result = runPoll({ count: 8, previousCount: 6 });

    expect(result).toBe(false);
  });

  // ── Test 13 ────────────────────────────────────────────────────────────────
  it('full round-trip: spike → sustained → recovery → second spike', () => {
    // Spike 1
    expect(runPoll({ count: 5, previousCount: 0 })).toBe(true);

    // Sustained above threshold — no re-alert
    expect(runPoll({ count: 6, previousCount: 5 })).toBe(false);
    expect(runPoll({ count: 7, previousCount: 6 })).toBe(false);

    // Recovery below threshold — sentinel resets
    expect(runPoll({ count: 3, previousCount: 7 })).toBe(false);
    expect(getSentryAlertedAt()).toBeNull();

    // Spike 2 — should alert again
    expect(runPoll({ count: 5, previousCount: 3 })).toBe(true);
    expect(getSentryAlertedAt()).not.toBeNull();
  });
});
