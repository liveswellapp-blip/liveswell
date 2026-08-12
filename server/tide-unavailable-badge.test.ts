/**
 * tide-unavailable-badge.test.ts
 *
 * Confirms that when a NOAA tide-station fetch fails:
 *   1. fetchTideData returns source: '<station-name> (unavailable)'
 *   2. The "(unavailable)" suffix is present (not just the station name)
 *   3. Fallback tide values are still returned so the UI doesn't break
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchTideData } from "./weather-service";

// ---------------------------------------------------------------------------
// Coordinates that map to a known station in tideStationMap (Mayport /
// Jacksonville, FL — latRange [29,31] lonRange [-82,-80])
// ---------------------------------------------------------------------------
const LAT = 30;
const LON = -81;

// ---------------------------------------------------------------------------
// Helper: replace the global fetch with a stub that throws a network error
// ---------------------------------------------------------------------------
function mockFetchToFail(message = "Network error") {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(message));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("fetchTideData — NOAA station temporarily unavailable", () => {
  it("returns source containing '(unavailable)' when fetch throws", async () => {
    mockFetchToFail("ECONNREFUSED");

    const result = await fetchTideData(LAT, LON);

    expect(result.source).toContain("(unavailable)");
  });

  it("includes the matched station name before '(unavailable)'", async () => {
    mockFetchToFail("timeout");

    const result = await fetchTideData(LAT, LON);

    // The station name should NOT be empty — it identifies which station failed
    const [stationPart] = result.source!.split(" (unavailable)");
    expect(stationPart.trim().length).toBeGreaterThan(0);
  });

  it("source is NOT the plain 'estimated' string when a station is mapped", async () => {
    mockFetchToFail("DNS error");

    const result = await fetchTideData(LAT, LON);

    // 'estimated' (no suffix) is only for unmapped coordinates
    expect(result.source).not.toBe("estimated");
  });

  it("still returns fallback currentTide and tideStatus values", async () => {
    mockFetchToFail("503 Service Unavailable");

    const result = await fetchTideData(LAT, LON);

    expect(typeof result.currentTide).toBe("number");
    expect(result.tideStatus).toMatch(/Rising|Falling/);
  });

  it("still returns fallback tideHigh / tideLow arrays", async () => {
    mockFetchToFail("read ECONNRESET");

    const result = await fetchTideData(LAT, LON);

    expect(Array.isArray(result.tideHigh)).toBe(true);
    expect(result.tideHigh.length).toBeGreaterThan(0);
    expect(Array.isArray(result.tideLow)).toBe(true);
    expect(result.tideLow.length).toBeGreaterThan(0);
  });

  it("source for an unmapped coordinate is plain 'estimated', not '(unavailable)'", async () => {
    // Coordinates with no station entry (far international — e.g. Teahupo'o)
    const result = await fetchTideData(-17.85, -149.23);

    // fetch should not have been called (no station to query), so no mock needed
    expect(result.source).toBe("estimated");
    expect(result.source).not.toContain("(unavailable)");
  });
});

describe("fetchTideData — NOAA API returns a non-OK HTTP status", () => {
  it("returns source containing '(unavailable)' on a 503 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Service Unavailable" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await fetchTideData(LAT, LON);

    expect(result.source).toContain("(unavailable)");
  });

  it("returns source containing '(unavailable)' on a 500 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const result = await fetchTideData(LAT, LON);

    expect(result.source).toContain("(unavailable)");
  });
});

describe("fetchTideData — NOAA returns empty data array", () => {
  it("returns source containing '(unavailable)' when data array is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await fetchTideData(LAT, LON);

    expect(result.source).toContain("(unavailable)");
  });
});
