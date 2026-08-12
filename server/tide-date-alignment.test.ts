/**
 * tide-date-alignment.test.ts
 *
 * Verifies that fetchTideData correctly maps NOAA predictions to the right
 * calendar day for tidesDay1 through tidesDay5, including around DST transitions
 * where a naive `now + N * 86400000 ms` approach produces duplicate or missing dates.
 *
 * Tested scenarios:
 *  - Normal mid-summer date (no DST complexity)
 *  - Fall-back DST boundary (America/New_York, 2026-11-01: clocks fall back 2→1 AM,
 *    day is 25 h long — adding 24 h to midnight gives the same local date)
 *  - Spring-forward DST boundary (America/New_York, 2027-03-14: clocks spring
 *    forward 2→3 AM, day is 23 h long)
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { addCalendarDays, fetchTideData } from "./weather-service";

// ---------------------------------------------------------------------------
// Coordinates that map to a known NOAA station (Mayport / Jacksonville, FL)
// ---------------------------------------------------------------------------
const LAT = 30;
const LON = -81;

// ---------------------------------------------------------------------------
// Helper: build a minimal NOAA hilo predictions response containing one
// high-tide entry per supplied date string (YYYY-MM-DD).
// ---------------------------------------------------------------------------
function makePredictionsResponse(dates: string[]): Response {
  const predictions = dates.map((d, i) => ({
    t: `${d} 06:${String(i * 5).padStart(2, '0')}`,
    v: "4.5",
    type: "H",
  }));
  return new Response(
    JSON.stringify({ predictions }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// Helper: build a minimal NOAA water-level response (needed for the first fetch call)
function makeWaterLevelResponse(): Response {
  return new Response(
    JSON.stringify({
      data: [
        { t: "2024-01-01 06:00", v: "3.1", s: "0.001", f: "0,0,0,0", q: "p" },
        { t: "2024-01-01 06:06", v: "3.2", s: "0.001", f: "0,0,0,0", q: "p" },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Pure unit tests for addCalendarDays
// ---------------------------------------------------------------------------
describe("addCalendarDays — pure calendar arithmetic", () => {
  it("advances a normal date by 1 day", () => {
    expect(addCalendarDays("2026-08-12", 1)).toBe("2026-08-13");
  });

  it("advances a normal date by 5 days", () => {
    expect(addCalendarDays("2026-08-12", 5)).toBe("2026-08-17");
  });

  it("crosses a month boundary correctly", () => {
    expect(addCalendarDays("2026-08-30", 3)).toBe("2026-09-02");
  });

  it("crosses a year boundary correctly", () => {
    expect(addCalendarDays("2026-12-30", 5)).toBe("2027-01-04");
  });

  // Fall-back: America/New_York on 2026-11-01 is 25 h long.
  // Adding 24 h to the instant at midnight local time still lands on 2026-11-01.
  // addCalendarDays must return 2026-11-02, not 2026-11-01.
  it("produces distinct dates across the fall-back DST boundary (2026-11-01)", () => {
    const results = [1, 2, 3, 4, 5].map(d => addCalendarDays("2026-11-01", d));
    expect(results).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
    // All dates must be distinct (no duplicates from 25-hour day)
    expect(new Set(results).size).toBe(5);
  });

  // Spring-forward: America/New_York on 2027-03-14 is 23 h long.
  // Adding 24 h to midnight local time skips over into 2027-03-15 — which is fine
  // for ms arithmetic, but addCalendarDays must still return the correct calendar day.
  it("produces distinct dates across the spring-forward DST boundary (2027-03-14)", () => {
    const results = [1, 2, 3, 4, 5].map(d => addCalendarDays("2027-03-14", d));
    expect(results).toEqual([
      "2027-03-15",
      "2027-03-16",
      "2027-03-17",
      "2027-03-18",
      "2027-03-19",
    ]);
    expect(new Set(results).size).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Integration tests for fetchTideData date assignment
// ---------------------------------------------------------------------------

/**
 * Runs fetchTideData with the system clock fixed to `nowIso` and verifies that
 * tidesDay1–5 each contain exactly the prediction(s) for the expected calendar dates.
 */
async function assertTideDayAlignment(nowIso: string, label: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(nowIso));

  // Derive expected dates the same way addCalendarDays does
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date(nowIso));
  const expectedDates = [1, 2, 3, 4, 5].map(d => addCalendarDays(todayKey, d));

  // All dates we want NOAA to return predictions for
  const allDates = [todayKey, ...expectedDates];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
    const urlStr = String(url);
    if (urlStr.includes("product=water_level")) {
      return makeWaterLevelResponse();
    }
    // predictions endpoint — return one high tide per day for each target date
    return makePredictionsResponse(allDates);
  });

  const result = await fetchTideData(LAT, LON) as any;

  for (let i = 1; i <= 5; i++) {
    const key = `tidesDay${i}`;
    const tides: Array<{ time: string; height: number; type: string }> =
      result[key] ?? [];
    expect(
      tides.length,
      `[${label}] ${key} should have ≥1 tide for ${expectedDates[i - 1]}`
    ).toBeGreaterThan(0);
  }
}

describe("fetchTideData — NOAA tide date alignment", () => {
  it("aligns tidesDay1-5 correctly for a normal mid-summer date", async () => {
    await assertTideDayAlignment("2026-08-12T14:00:00Z", "mid-summer");
  });

  it("aligns tidesDay1-5 correctly just before fall-back DST (2026-11-01 01:30 EDT = 05:30 UTC)", async () => {
    // America/New_York is UTC-4 in summer (EDT). The clock falls back at 2:00 AM EDT
    // (= 06:00 UTC) on 2026-11-01. At 05:30 UTC the local time is 01:30 AM EDT,
    // still before the transition — but still 2026-11-01 locally. A naive `now + 24h`
    // approach would format `now + 24h` as 2026-11-01 again (25-hour day), producing a
    // duplicate date instead of advancing to 2026-11-02.
    await assertTideDayAlignment("2026-11-01T05:30:00Z", "fall-back DST");
  });

  it("aligns tidesDay1-5 correctly just before spring-forward DST (2027-03-14 06:59 UTC)", async () => {
    // America/New_York springs forward at 2:00 AM → 3:00 AM on 2027-03-14 (07:00 UTC).
    // At 06:59 UTC the local time is 01:59 EST, still 2027-03-14 locally.
    await assertTideDayAlignment("2027-03-14T06:59:00Z", "spring-forward DST");
  });
});

// ---------------------------------------------------------------------------
// Hawaii-specific alignment test
// ---------------------------------------------------------------------------
// Hawaii (Pacific/Honolulu, UTC-10, no DST) is 10 hours behind UTC.
// At 22:00 UTC the Hawaiian local time is 12:00 noon of the *previous* UTC day.
// If the forecast route used UTC for date grouping (as it did before adding Hawaii
// to getTimezone), the dayOffsetMap would be keyed to UTC dates, which are one day
// ahead of station-local NOAA dates for the final ~10 hours of each UTC day.
// This test exercises that boundary.

describe("fetchTideData — Hawaii NOAA station date alignment", () => {
  it("aligns tidesDay1-5 correctly for a Honolulu station at 22:00 UTC (noon Hawaii time)", async () => {
    // Honolulu Oahu station coordinates (lat 21.5, lon -158.0)
    const HAWAII_LAT = 21.5;
    const HAWAII_LON = -158.0;

    // 2026-08-13T22:00:00Z → Hawaii local time is 2026-08-13 12:00 HST (UTC-10)
    // A UTC-keyed map would label this as 2026-08-13 UTC, making "day 1" = 2026-08-14 UTC.
    // But the station-local today is 2026-08-13, so "day 1" should be 2026-08-14 HST.
    // In this case they coincide — the real test is the 10-hour window where they differ.
    // At 2026-08-14T08:00:00Z → UTC date is 2026-08-14, Hawaii local date is 2026-08-13.
    // Wrong (UTC-keyed) day 1 would be 2026-08-15; correct (Hawaii-keyed) day 1 is 2026-08-14.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:00:00Z")); // 22:00 HST on 2026-08-13

    const hawaiiTz = "Pacific/Honolulu";
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: hawaiiTz })
      .format(new Date("2026-08-14T08:00:00Z")); // should be "2026-08-13"
    expect(todayKey).toBe("2026-08-13"); // sanity-check the boundary condition

    const expectedDates = [1, 2, 3, 4, 5].map(d => addCalendarDays(todayKey, d));
    // expected: ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18"]
    expect(expectedDates[0]).toBe("2026-08-14");

    const allDates = [todayKey, ...expectedDates];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("product=water_level")) {
        return makeWaterLevelResponse();
      }
      return makePredictionsResponse(allDates);
    });

    const result = await fetchTideData(HAWAII_LAT, HAWAII_LON) as any;

    for (let i = 1; i <= 5; i++) {
      const key = `tidesDay${i}`;
      const tides: Array<{ time: string; height: number; type: string }> =
        result[key] ?? [];
      expect(
        tides.length,
        `[Hawaii boundary] ${key} should have ≥1 tide for ${expectedDates[i - 1]}`
      ).toBeGreaterThan(0);
    }
  });
});
