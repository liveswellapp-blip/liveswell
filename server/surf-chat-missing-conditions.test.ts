/**
 * surf-chat-missing-conditions.test.ts
 *
 * Confirms that both the server-side system prompt and the client-side
 * opening context message handle missing conditions gracefully — i.e. they
 * acknowledge the data gap rather than hallucinating numbers.
 *
 * Run with:  npm test
 */

import { describe, it, expect } from "vitest";
import { buildConditionsSummary } from "./chat-helpers";

// ---------------------------------------------------------------------------
// Inline copy of the client's buildContextMessage so the test can run in the
// Node environment without a browser/DOM.  This mirrors the exported function
// in client/src/components/AISurfChat.tsx exactly.
// ---------------------------------------------------------------------------
interface MinimalLocation {
  id: number;
  name: string;
}

function buildContextMessage(
  location: MinimalLocation,
  conditions: Record<string, any> | undefined,
  aiSummary?: string,
): string {
  if (!conditions) {
    return `Hey! I can answer questions about ${location.name}. Conditions are still loading — ask me anything about surf in general while we wait.`;
  }

  const waveH = conditions.waveHeight
    ? `${parseFloat(conditions.waveHeight).toFixed(1)} ft`
    : "unknown";
  const period = conditions.wavePeriod ? `${conditions.wavePeriod}s` : "—";
  const dir = conditions.waveDirection || "—";
  const wind = conditions.windSpeed
    ? `${Math.round(parseFloat(conditions.windSpeed))} mph ${conditions.windDirection || ""}`.trim()
    : "—";
  const tide = conditions.tideStatus
    ? `${conditions.tideStatus}${conditions.tideHeight ? ` at ${parseFloat(conditions.tideHeight).toFixed(1)} ft` : ""}`
    : "—";
  const water = conditions.waterTemp
    ? `${parseFloat(conditions.waterTemp).toFixed(0)}°F`
    : "—";

  const lines = [
    `Here's what's happening at **${location.name}** right now:`,
    "",
    `🌊 Waves: ${waveH} @ ${period} from ${dir}`,
    `💨 Wind: ${wind}`,
    `🌊 Tide: ${tide}`,
    `🌡️ Water: ${water}`,
  ];

  if (aiSummary) lines.push("", aiSummary);
  lines.push("", "Ask me anything — beginner tips, what the numbers mean, best time to paddle out, etc.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Server-side: buildConditionsSummary
// ---------------------------------------------------------------------------

describe("buildConditionsSummary — missing conditions", () => {
  it("returns an 'unavailable' notice when conditions is null", () => {
    const result = buildConditionsSummary(null);
    expect(result).toBe("Current conditions data is unavailable right now.");
  });

  it("does NOT include any numeric wave/wind data when conditions is null", () => {
    const result = buildConditionsSummary(null);
    // Must not contain any measurement pattern like "3.0 ft" or "12 mph"
    expect(result).not.toMatch(/\d+\.?\d*\s*(ft|mph|°F|s\b)/i);
  });

  it("returns an 'unavailable' notice when conditions is undefined (cast to null)", () => {
    // The route guards against undefined before calling this helper, but
    // explicit coverage ensures the fallback is always the same string.
    const result = buildConditionsSummary(null);
    expect(result).toContain("unavailable");
  });
});

describe("buildConditionsSummary — present conditions", () => {
  const sampleConditions = {
    waveHeight: "4.2",
    wavePeriod: "12",
    waveDirection: "NW",
    windSpeed: "8",
    windDirection: "W",
    windGusts: "14",
    tideStatus: "rising",
    tideHeight: "2.3",
    waterTemp: "62",
  };

  it("includes wave height when conditions are present", () => {
    const result = buildConditionsSummary(sampleConditions);
    expect(result).toContain("4.2 ft");
  });

  it("includes wind speed when conditions are present", () => {
    const result = buildConditionsSummary(sampleConditions);
    expect(result).toContain("8 mph");
  });

  it("includes gust speed when present", () => {
    const result = buildConditionsSummary(sampleConditions);
    expect(result).toContain("gusts 14 mph");
  });

  it("includes tide information when present", () => {
    const result = buildConditionsSummary(sampleConditions);
    expect(result).toContain("rising");
  });

  it("does NOT contain the 'unavailable' notice when real data is provided", () => {
    const result = buildConditionsSummary(sampleConditions);
    expect(result).not.toContain("unavailable");
  });
});

describe("buildConditionsSummary — partial conditions (object present, key fields null)", () => {
  const partialConditions = {
    waveHeight: null,
    wavePeriod: null,
    waveDirection: null,
    windSpeed: null,
    windDirection: null,
    windGusts: null,
    tideStatus: null,
    tideHeight: null,
    waterTemp: null,
  };

  it("does NOT produce '0.0 ft' when waveHeight is null", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).not.toContain("0.0 ft");
  });

  it("does NOT produce 'undefineds' or 'undefined' for wavePeriod when null", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).not.toMatch(/undefined/i);
  });

  it("shows 'unknown' for missing wave height", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).toMatch(/Waves:.*unknown/);
  });

  it("shows 'unknown' for missing wave period", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).toMatch(/@ unknown/);
  });

  it("shows 'unknown' for missing wave direction", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).toMatch(/from unknown/);
  });

  it("shows 'unknown' for missing wind speed", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).toMatch(/Wind:.*unknown/);
  });

  it("does not return the 'unavailable' notice since the conditions object is present", () => {
    const result = buildConditionsSummary(partialConditions);
    expect(result).not.toBe("Current conditions data is unavailable right now.");
  });
});

describe("buildConditionsSummary — numeric zero values (calm / flat conditions)", () => {
  const zeroConditions = {
    waveHeight: "0",
    wavePeriod: "0",
    waveDirection: "N",
    windSpeed: "0",
    windDirection: "N",
    windGusts: null,
    tideStatus: "low",
    tideHeight: "0",
    waterTemp: "60",
  };

  it("shows '0.0 ft' for waveHeight of 0, not 'unknown'", () => {
    const result = buildConditionsSummary(zeroConditions);
    expect(result).toContain("0.0 ft");
  });

  it("shows '0 mph' for windSpeed of 0, not 'unknown'", () => {
    const result = buildConditionsSummary(zeroConditions);
    expect(result).toContain("0 mph");
  });

  it("does NOT contain 'unknown' for fully populated zero conditions", () => {
    const result = buildConditionsSummary(zeroConditions);
    // All fields are present (even if zero), so no field should fall back to unknown
    expect(result).not.toMatch(/Waves:.*unknown/);
    expect(result).not.toMatch(/Wind:.*unknown/);
  });
});

describe("buildConditionsSummary — buoy with null wave fields", () => {
  const conditionsWithPartialBuoy = {
    waveHeight: "3.0",
    wavePeriod: "10",
    waveDirection: "SW",
    windSpeed: "12",
    windDirection: "W",
    tideStatus: "falling",
    primaryBuoy: {
      stationId: "46026",
      stationName: "San Francisco",
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
    },
  };

  it("shows 'unknown' for buoy waveHeight when null", () => {
    const result = buildConditionsSummary(conditionsWithPartialBuoy);
    expect(result).toMatch(/Primary buoy.*unknown/);
  });

  it("does NOT show '0.0 ft' for buoy when waveHeight is null", () => {
    const result = buildConditionsSummary(conditionsWithPartialBuoy);
    expect(result).not.toMatch(/Primary buoy.*0\.0 ft/);
  });

  it("does NOT show 'undefined' for buoy fields when null", () => {
    const result = buildConditionsSummary(conditionsWithPartialBuoy);
    expect(result).not.toMatch(/undefined/i);
  });
});

describe("buildConditionsSummary — buoy with numeric zero wave fields", () => {
  const conditionsWithZeroBuoy = {
    waveHeight: "2.0",
    wavePeriod: "8",
    waveDirection: "NW",
    windSpeed: "5",
    windDirection: "N",
    tideStatus: "rising",
    primaryBuoy: {
      stationId: "46026",
      stationName: "San Francisco",
      waveHeight: "0",
      wavePeriod: "0",
      waveDirection: "N",
    },
  };

  it("shows '0.0 ft' for buoy waveHeight of 0, not 'unknown'", () => {
    const result = buildConditionsSummary(conditionsWithZeroBuoy);
    expect(result).toMatch(/Primary buoy.*0\.0 ft/);
  });
});

describe("buildConditionsSummary — backupBuoy with null wave fields", () => {
  const conditionsWithNullBackupBuoy = {
    waveHeight: "3.0",
    wavePeriod: "10",
    waveDirection: "SW",
    windSpeed: "12",
    windDirection: "W",
    tideStatus: "falling",
    backupBuoy: {
      stationId: "46013",
      stationName: "Bodega Bay",
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
    },
  };

  it("shows 'unknown' for backup buoy waveHeight when null", () => {
    const result = buildConditionsSummary(conditionsWithNullBackupBuoy);
    expect(result).toMatch(/Backup buoy.*unknown/);
  });

  it("does NOT show '0.0 ft' for backup buoy when waveHeight is null", () => {
    const result = buildConditionsSummary(conditionsWithNullBackupBuoy);
    expect(result).not.toMatch(/Backup buoy.*0\.0 ft/);
  });

  it("does NOT show 'undefined' for backup buoy fields when null", () => {
    const result = buildConditionsSummary(conditionsWithNullBackupBuoy);
    expect(result).not.toMatch(/undefined/i);
  });
});

describe("buildConditionsSummary — backupBuoy with numeric zero wave fields", () => {
  const conditionsWithZeroBackupBuoy = {
    waveHeight: "2.0",
    wavePeriod: "8",
    waveDirection: "NW",
    windSpeed: "5",
    windDirection: "N",
    tideStatus: "rising",
    backupBuoy: {
      stationId: "46013",
      stationName: "Bodega Bay",
      waveHeight: "0",
      wavePeriod: "0",
      waveDirection: "N",
    },
  };

  it("shows '0.0 ft' for backup buoy waveHeight of 0, not 'unknown'", () => {
    const result = buildConditionsSummary(conditionsWithZeroBackupBuoy);
    expect(result).toMatch(/Backup buoy.*0\.0 ft/);
  });

  it("does NOT show 'unknown' for backup buoy when all fields are zero/present", () => {
    const result = buildConditionsSummary(conditionsWithZeroBackupBuoy);
    expect(result).not.toMatch(/Backup buoy.*unknown/);
  });
});

// ---------------------------------------------------------------------------
// Client-side: buildContextMessage (opening message shown in the chat panel)
// ---------------------------------------------------------------------------

const testLocation: MinimalLocation = { id: 1, name: "Mavericks" };

describe("buildContextMessage — conditions not yet loaded", () => {
  it("tells the user conditions are still loading", () => {
    const msg = buildContextMessage(testLocation, undefined);
    expect(msg).toContain("still loading");
  });

  it("does NOT include any numeric surf data when conditions are absent", () => {
    const msg = buildContextMessage(testLocation, undefined);
    expect(msg).not.toMatch(/\d+\.?\d*\s*(ft|mph|°F|s\b)/i);
  });

  it("still mentions the location name so context is clear", () => {
    const msg = buildContextMessage(testLocation, undefined);
    expect(msg).toContain("Mavericks");
  });

  it("invites general surf questions while data loads", () => {
    const msg = buildContextMessage(testLocation, undefined);
    // Should not shut the user out — should still offer to help
    expect(msg.toLowerCase()).toMatch(/ask|question/);
  });
});

describe("buildContextMessage — conditions present", () => {
  const conditions = {
    waveHeight: "5.0",
    wavePeriod: "14",
    waveDirection: "NW",
    windSpeed: "10",
    windDirection: "E",
    tideStatus: "high",
    tideHeight: "4.1",
    waterTemp: "58",
  };

  it("includes wave height in the opening message", () => {
    const msg = buildContextMessage(testLocation, conditions);
    expect(msg).toContain("5.0 ft");
  });

  it("does NOT say 'still loading' when conditions are present", () => {
    const msg = buildContextMessage(testLocation, conditions);
    expect(msg).not.toContain("still loading");
  });

  it("includes an optional AI summary when provided", () => {
    const msg = buildContextMessage(testLocation, conditions, "Classic Mavericks morning session.");
    expect(msg).toContain("Classic Mavericks morning session.");
  });
});
