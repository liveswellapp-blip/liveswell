/**
 * quota-warning.test.ts
 *
 * Verifies that checkConditionAlerts() emits the low-quota console.warn when
 * remainingCalls ≤ OPENWEATHER_QUOTA_WARN_THRESHOLD, and suppresses it when
 * the threshold is 0 or when remaining calls are above the threshold.
 *
 * All external I/O (storage, weather fetching) is stubbed so the test runs
 * completely offline and does not hit the database or any API.
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We need to intercept imports before the module under test is loaded.
// vi.mock() calls are hoisted by Vitest to the top of the file.
// ---------------------------------------------------------------------------

vi.mock('./storage', () => ({
  storage: {
    getActiveConditionAlerts: vi.fn(),
    getActiveDailyReportAlerts: vi.fn().mockResolvedValue([]),
    getAllLocations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('./monitoring', async (importOriginal) => {
  // Keep resetDailyMetrics from the real module; stub getOpenWeatherRemainingCalls
  const real = await importOriginal<typeof import('./monitoring')>();
  return {
    ...real,
    getOpenWeatherRemainingCalls: vi.fn(),
    resetDailyMetrics: vi.fn(),
    trackRequest: vi.fn(),
  };
});

// Stub heavy downstream modules that condition-monitor imports
vi.mock('./sms-service', () => ({ SMSService: { sendConditionAlert: vi.fn() } }));
vi.mock('./email-service', () => ({ EmailService: { sendConditionAlert: vi.fn() } }));
vi.mock('./push-service', () => ({ pushNotificationService: { sendCustomNotification: vi.fn() } }));
vi.mock('./weather-service', () => ({ fetchWeatherData: vi.fn() }));
vi.mock('./ai-service', () => ({ generateNotificationSummary: vi.fn() }));
vi.mock('./sentry', () => ({ Sentry: { captureException: vi.fn() } }));

import { storage } from './storage';
import { getOpenWeatherRemainingCalls } from './monitoring';
import { ConditionMonitor } from './condition-monitor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal fake condition alert that will pass storage validation. */
const fakeAlert = {
  id: 1,
  userId: 'user-test',
  locationId: 42,
  alertType: 'swell',
  thresholds: { minWaveHeight: 999 }, // unreachable — alert won't fire
  deliveryChannels: [],
  cooldownHours: 4,
  lastFiredAt: null,
  phoneNumber: null,
  phoneVerified: false,
  userEmail: null,
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('checkConditionAlerts — OpenWeather quota warning', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const originalThreshold = process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {}); // silence noise
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default: storage returns one alert so the quota-guard block is reached
    vi.mocked(storage.getActiveConditionAlerts).mockResolvedValue([fakeAlert]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore env to its original value (may be undefined)
    if (originalThreshold === undefined) {
      delete process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD;
    } else {
      process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD = originalThreshold;
    }
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it('fires the warning when remaining calls are below a high threshold (2000)', async () => {
    // Simulate 50 calls remaining vs a threshold of 2000 → warning must fire
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(50);
    process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD = '2000';

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    expect(quotaWarn).toBeDefined();
    // Must include the remaining count so operators know exactly how many calls are left
    expect(quotaWarn).toContain('50');
    // Must include the upgrade URL so operators know where to act
    expect(quotaWarn).toContain('https://openweathermap.org/api');
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it('fires the warning when remaining calls exactly equal the threshold', async () => {
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(100);
    process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD = '100'; // exactly at boundary

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    expect(quotaWarn).toBeDefined();
    expect(quotaWarn).toContain('100');
    expect(quotaWarn).toContain('https://openweathermap.org/api');
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('suppresses the warning when remaining calls are above the threshold', async () => {
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(500);
    process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD = '100'; // 500 > 100 → no warning

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    expect(quotaWarn).toBeUndefined();
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it('suppresses the warning when OPENWEATHER_QUOTA_WARN_THRESHOLD=0', async () => {
    // Even with zero calls left, threshold=0 means "never warn"
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(0);
    process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD = '0';

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    expect(quotaWarn).toBeUndefined();
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it('uses the default threshold of 100 when env var is not set', async () => {
    delete process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD;
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(99); // below default 100

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    expect(quotaWarn).toBeDefined();
    expect(quotaWarn).toContain('99');
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it('skips the quota guard entirely when there are no active condition alerts', async () => {
    vi.mocked(storage.getActiveConditionAlerts).mockResolvedValue([]);
    vi.mocked(getOpenWeatherRemainingCalls).mockReturnValue(0); // would trigger if reached

    await ConditionMonitor.checkConditionAlerts();

    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const quotaWarn = warnCalls.find((msg) => msg.includes('quota low'));

    // No alerts → early return before quota guard → no warning
    expect(quotaWarn).toBeUndefined();
  });
});
