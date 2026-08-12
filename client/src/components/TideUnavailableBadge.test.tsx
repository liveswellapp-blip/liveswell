// @vitest-environment jsdom

/**
 * TideUnavailableBadge.test.tsx
 *
 * Confirms that the production TideSourceBadge component (used by
 * CurrentConditions) renders correctly for every tideSource variant:
 *
 *   tideSource = "<name> (unavailable)"  → amber "Estimated (station temporarily unavailable)" badge
 *   tideSource = "estimated"             → amber "Estimated (no station mapped)" badge
 *   tideSource = "<name>"               → "NOAA Tides & Currents data" attribution
 *   tideSource = undefined               → "NOAA Tides & Currents data" attribution (safe default)
 *
 * Imports the real TideSourceBadge component so any regression in the
 * production code causes these tests to fail.
 *
 * Run with:  npm test
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import TideSourceBadge from "./TideSourceBadge";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TideSourceBadge — station temporarily unavailable", () => {
  it("renders the amber unavailable badge when tideSource ends with '(unavailable)'", () => {
    render(<TideSourceBadge tideSource="Mayport (unavailable)" />);
    const badge = screen.getByTitle(
      "Tide station Mayport is temporarily unavailable — showing estimated tides"
    );
    expect(badge).toBeTruthy();
  });

  it("shows 'Estimated (station temporarily unavailable)' text", () => {
    render(<TideSourceBadge tideSource="Mayport (unavailable)" />);
    expect(screen.getByText("Estimated (station temporarily unavailable)")).toBeTruthy();
  });

  it("does NOT show the 'NOAA Tides & Currents data' text when station is unavailable", () => {
    render(<TideSourceBadge tideSource="Mayport (unavailable)" />);
    expect(screen.queryByText("NOAA Tides & Currents data")).toBeNull();
  });

  it("includes the station name in the title tooltip", () => {
    render(<TideSourceBadge tideSource="Honolulu (unavailable)" />);
    const badge = screen.getByTitle(
      "Tide station Honolulu is temporarily unavailable — showing estimated tides"
    );
    expect(badge).toBeTruthy();
  });

  it("works with any station name in the '(unavailable)' pattern", () => {
    render(<TideSourceBadge tideSource="San Francisco (unavailable)" />);
    expect(screen.getByText("Estimated (station temporarily unavailable)")).toBeTruthy();
  });
});

describe("TideSourceBadge — no station mapped (estimated)", () => {
  it("renders the amber badge when tideSource is exactly 'estimated'", () => {
    render(<TideSourceBadge tideSource="estimated" />);
    const badge = screen.getByTitle(
      "No NOAA tide station is mapped for this location — showing estimated tides"
    );
    expect(badge).toBeTruthy();
  });

  it("shows 'Estimated (no station mapped)' — not the 'temporarily unavailable' copy", () => {
    render(<TideSourceBadge tideSource="estimated" />);
    expect(screen.getByText("Estimated (no station mapped)")).toBeTruthy();
    expect(screen.queryByText("Estimated (station temporarily unavailable)")).toBeNull();
  });

  it("tooltip says 'No NOAA tide station is mapped' for the estimated source", () => {
    render(<TideSourceBadge tideSource="estimated" />);
    const badge = screen.getByTitle(
      "No NOAA tide station is mapped for this location — showing estimated tides"
    );
    expect(badge).toBeTruthy();
  });

  it("does NOT show the 'NOAA Tides & Currents data' text", () => {
    render(<TideSourceBadge tideSource="estimated" />);
    expect(screen.queryByText("NOAA Tides & Currents data")).toBeNull();
  });
});

describe("TideSourceBadge — real NOAA data (no badge)", () => {
  it("shows 'NOAA Tides & Currents data' when tideSource is a plain station name", () => {
    render(<TideSourceBadge tideSource="Mayport" />);
    expect(screen.getByText("NOAA Tides & Currents data")).toBeTruthy();
  });

  it("does NOT render the amber badge when tideSource is a plain station name", () => {
    render(<TideSourceBadge tideSource="Boston" />);
    // The amber badge has a title; if it were rendered, a title query would match
    expect(screen.queryByText("Estimated (station temporarily unavailable)")).toBeNull();
    expect(screen.queryByText("Estimated (no station mapped)")).toBeNull();
  });

  it("shows NOAA attribution when tideSource is undefined", () => {
    render(<TideSourceBadge tideSource={undefined} />);
    expect(screen.getByText("NOAA Tides & Currents data")).toBeTruthy();
  });

  it("does NOT show the badge when tideSource is undefined", () => {
    render(<TideSourceBadge tideSource={undefined} />);
    expect(screen.queryByText("Estimated (station temporarily unavailable)")).toBeNull();
    expect(screen.queryByText("Estimated (no station mapped)")).toBeNull();
  });
});
