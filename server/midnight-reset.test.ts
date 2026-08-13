/**
 * midnight-reset.test.ts
 *
 * Verifies that resetDailyMetrics() correctly resets all daily counters so
 * the quota warning cannot carry over stale counts into the next day.
 *
 * Suite 1 – in-memory reset behaviour (uses the module-level singleton)
 * Suite 2 – loadPersistedLastReset() startup loading with a corrupted state
 *            file. Each test resets the module registry and dynamically
 *            imports monitoring.ts fresh so loadPersistedLastReset() runs
 *            with the correct fs mock in place.
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs before the module-level import so the singleton load in Suite 1
// does not attempt real disk access.
// ---------------------------------------------------------------------------
vi.mock('fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('fs')>();
  return {
    ...real,
    existsSync: vi.fn().mockReturnValue(false),  // no persisted state file
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),                        // swallow saveLastReset writes
  };
});

// monitoring.ts imports storage inside testDatabaseConnection() (lazy, inside
// a function) — mock it so healthCheck() can be called without a live DB.
vi.mock('./storage', () => ({
  storage: {
    getAllLocations: vi.fn().mockResolvedValue([]),
    getActiveConditionAlerts: vi.fn().mockResolvedValue([]),
    getActiveDailyReportAlerts: vi.fn().mockResolvedValue([]),
  },
}));

import * as fs from 'fs';
import {
  resetDailyMetrics,
  getOpenWeatherRemainingCalls,
  trackRequest,
  getMetrics,
} from './monitoring';

// ---------------------------------------------------------------------------
// Helper – capture the JSON body that getMetrics() writes to res.json()
// ---------------------------------------------------------------------------
function captureMetrics(): Record<string, any> {
  let captured: Record<string, any> = {};
  const fakeRes = { json: (body: any) => { captured = body; } } as any;
  getMetrics({} as any, fakeRes);
  return captured;
}

// ============================================================================
// Suite 1: resetDailyMetrics() restores counters after simulated API usage
// ============================================================================

describe('resetDailyMetrics — counter reset at midnight', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores the full OpenWeather daily limit after calls have been made', () => {
    for (let i = 0; i < 50; i++) trackRequest(true, 'openweather');
    expect(getOpenWeatherRemainingCalls()).toBeLessThan(1000);

    resetDailyMetrics();

    expect(getOpenWeatherRemainingCalls()).toBe(1000);
  });

  it('resets requestsToday to 0', () => {
    trackRequest(true, 'openweather');
    trackRequest(false, 'openweather');

    resetDailyMetrics();

    expect(captureMetrics().openweather.requestsToday).toBe(0);
  });

  it('updates lastReset to a current ISO timestamp', () => {
    const before = new Date().toISOString();

    resetDailyMetrics();

    const m = captureMetrics();
    expect(typeof m.lastReset).toBe('string');
    expect(new Date(m.lastReset).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
  });

  it('sets lastReset to a value within the last 5 seconds', () => {
    resetDailyMetrics();

    const m = captureMetrics();
    expect(Date.now() - new Date(m.lastReset).getTime()).toBeLessThan(5000);
  });

  it('resets all push-notification counters to zero', () => {
    resetDailyMetrics();

    const m = captureMetrics();
    expect(m.pushNotifications.sentToday).toBe(0);
    expect(m.pushNotifications.failedToday).toBe(0);
    expect(m.pushNotifications.cleanedUpToday).toBe(0);
  });

  it('resets all NOAA counters to zero', () => {
    trackRequest(true, 'noaa');
    trackRequest(false, 'noaa');

    resetDailyMetrics();

    expect(captureMetrics().noaa.requestsToday).toBe(0);
  });

  it('persists the new lastReset via writeFileSync', () => {
    const writeSpy = vi.mocked(fs.writeFileSync);
    writeSpy.mockClear();

    resetDailyMetrics();

    expect(writeSpy).toHaveBeenCalledOnce();
    const [, written] = writeSpy.mock.calls[0] as [any, string, any];
    const payload = JSON.parse(written);
    expect(payload).toHaveProperty('lastReset');
    expect(new Date(payload.lastReset).getTime()).not.toBeNaN();
  });

  it('calling reset twice in a row keeps remainingCalls at the full limit', () => {
    resetDailyMetrics();
    resetDailyMetrics();

    expect(getOpenWeatherRemainingCalls()).toBe(1000);
  });

  it('does not throw when writeFileSync fails (disk full scenario)', () => {
    vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
      throw new Error('ENOSPC: no space left on device');
    });

    expect(() => resetDailyMetrics()).not.toThrow();
    expect(getOpenWeatherRemainingCalls()).toBe(1000);
  });
});

// ============================================================================
// Suite 2: loadPersistedLastReset() startup fallback for corrupted state files
//
// Each test calls vi.resetModules() then dynamically imports monitoring.ts so
// that loadPersistedLastReset() executes AFTER the fs mock is configured for
// that specific scenario. This is the only reliable way to test module-level
// initialisation code.
// ============================================================================

/**
 * Compute "last midnight UTC" as an ISO string the same way monitoring.ts does,
 * so we can assert the fallback value without duplicating the logic.
 */
function expectedLastMidnightUTC(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

describe('loadPersistedLastReset — corrupted state file fallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore module registry so the next test gets a completely fresh load
    vi.resetModules();
  });

  // Helper: load a fresh monitoring module with the fs mock already configured
  async function loadFreshMonitoring() {
    // Module registry was cleared in afterEach of the previous test; clear it
    // here too in case this is the first test in the suite.
    vi.resetModules();
    // Re-apply mocks for the fresh registry
    vi.doMock('fs', async (importOriginal: any) => {
      const real = await importOriginal();
      return {
        ...real,
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
      };
    });
    vi.doMock('./storage', () => ({
      storage: {
        getAllLocations: vi.fn().mockResolvedValue([]),
      },
    }));
    return import('./monitoring');
  }

  it('falls back to last midnight UTC when state file contains invalid JSON', async () => {
    vi.resetModules();
    vi.doMock('fs', async (importOriginal: any) => {
      const real = await importOriginal();
      return {
        ...real,
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('NOT_VALID_JSON'),
        writeFileSync: vi.fn(),
      };
    });
    vi.doMock('./storage', () => ({ storage: { getAllLocations: vi.fn().mockResolvedValue([]) } }));

    const mod = await import('./monitoring');

    // The module must not have crashed; getOpenWeatherRemainingCalls must work
    expect(mod.getOpenWeatherRemainingCalls()).toBe(1000);

    // lastReset must equal last midnight UTC (the fallback value)
    const m: Record<string, any> = {};
    mod.getMetrics({} as any, { json: (b: any) => Object.assign(m, b) } as any);
    expect(m.lastReset).toBe(expectedLastMidnightUTC());
  });

  it('falls back to last midnight UTC when state file is empty', async () => {
    vi.resetModules();
    vi.doMock('fs', async (importOriginal: any) => {
      const real = await importOriginal();
      return {
        ...real,
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(''),
        writeFileSync: vi.fn(),
      };
    });
    vi.doMock('./storage', () => ({ storage: { getAllLocations: vi.fn().mockResolvedValue([]) } }));

    const mod = await import('./monitoring');

    const m: Record<string, any> = {};
    mod.getMetrics({} as any, { json: (b: any) => Object.assign(m, b) } as any);
    expect(m.lastReset).toBe(expectedLastMidnightUTC());
  });

  it('falls back to last midnight UTC when state file JSON has no lastReset field', async () => {
    vi.resetModules();
    vi.doMock('fs', async (importOriginal: any) => {
      const real = await importOriginal();
      return {
        ...real,
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify({ someOtherField: 'value' })),
        writeFileSync: vi.fn(),
      };
    });
    vi.doMock('./storage', () => ({ storage: { getAllLocations: vi.fn().mockResolvedValue([]) } }));

    const mod = await import('./monitoring');

    const m: Record<string, any> = {};
    mod.getMetrics({} as any, { json: (b: any) => Object.assign(m, b) } as any);
    expect(m.lastReset).toBe(expectedLastMidnightUTC());
  });

  it('uses the persisted lastReset when the state file is valid', async () => {
    const persistedReset = '2026-08-13T00:00:00.000Z';

    vi.resetModules();
    vi.doMock('fs', async (importOriginal: any) => {
      const real = await importOriginal();
      return {
        ...real,
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify({ lastReset: persistedReset })),
        writeFileSync: vi.fn(),
      };
    });
    vi.doMock('./storage', () => ({ storage: { getAllLocations: vi.fn().mockResolvedValue([]) } }));

    const mod = await import('./monitoring');

    const m: Record<string, any> = {};
    mod.getMetrics({} as any, { json: (b: any) => Object.assign(m, b) } as any);
    expect(m.lastReset).toBe(persistedReset);
  });
});
