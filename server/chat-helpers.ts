/**
 * chat-helpers.ts
 *
 * Pure helper functions extracted from the /api/chat route so they can be
 * unit-tested without spinning up a full Express server.
 */

/**
 * Build the CURRENT CONDITIONS section that is injected into the AI system
 * prompt.  When `conditions` is null/undefined (fetch failed or data not yet
 * available), returns a plain "unavailable" notice so the model never
 * receives fabricated numbers.
 */
export function buildConditionsSummary(conditions: Record<string, any> | null): string {
  if (!conditions) {
    return "Current conditions data is unavailable right now.";
  }

  return [
    `- Waves: ${parseFloat(conditions.waveHeight || "0").toFixed(1)} ft @ ${conditions.wavePeriod}s from ${conditions.waveDirection}`,
    `- Wind: ${Math.round(parseFloat(conditions.windSpeed || "0"))} mph from ${conditions.windDirection}${conditions.windGusts ? `, gusts ${Math.round(parseFloat(conditions.windGusts))} mph` : ""}`,
    `- Tide: ${conditions.tideStatus}${conditions.tideHeight ? ` at ${parseFloat(conditions.tideHeight).toFixed(1)} ft` : ""}`,
    `- Water temp: ${conditions.waterTemp ? `${parseFloat(conditions.waterTemp).toFixed(0)}°F` : "unknown"}`,
    conditions.primaryBuoy
      ? `- Primary buoy (${conditions.primaryBuoy.stationName || conditions.primaryBuoy.stationId}): ${parseFloat(conditions.primaryBuoy.waveHeight || "0").toFixed(1)} ft @ ${conditions.primaryBuoy.wavePeriod}s from ${conditions.primaryBuoy.waveDirection}`
      : null,
    conditions.backupBuoy
      ? `- Backup buoy (${conditions.backupBuoy.stationName || conditions.backupBuoy.stationId}): ${parseFloat(conditions.backupBuoy.waveHeight || "0").toFixed(1)} ft @ ${conditions.backupBuoy.wavePeriod}s from ${conditions.backupBuoy.waveDirection}`
      : null,
  ]
    .filter(Boolean)
    .join("\n") as string;
}
