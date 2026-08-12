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

  const isPresent = (v: any): boolean => v != null && v !== "";

  const waveHeight = isPresent(conditions.waveHeight)
    ? `${parseFloat(conditions.waveHeight).toFixed(1)} ft`
    : "unknown";
  const wavePeriod = isPresent(conditions.wavePeriod) ? `${conditions.wavePeriod}s` : "unknown";
  const waveDirection = isPresent(conditions.waveDirection) ? conditions.waveDirection : "unknown";
  const windSpeed = isPresent(conditions.windSpeed)
    ? `${Math.round(parseFloat(conditions.windSpeed))} mph`
    : "unknown";
  const windDirection = isPresent(conditions.windDirection) ? conditions.windDirection : "unknown";

  const buoyLine = (label: string, buoy: Record<string, any>) => {
    const bName = buoy.stationName || buoy.stationId || "unknown";
    const bWave = isPresent(buoy.waveHeight)
      ? `${parseFloat(buoy.waveHeight).toFixed(1)} ft`
      : "unknown";
    const bPeriod = isPresent(buoy.wavePeriod) ? `${buoy.wavePeriod}s` : "unknown";
    const bDir = isPresent(buoy.waveDirection) ? buoy.waveDirection : "unknown";
    return `- ${label} (${bName}): ${bWave} @ ${bPeriod} from ${bDir}`;
  };

  return [
    `- Waves: ${waveHeight} @ ${wavePeriod} from ${waveDirection}`,
    `- Wind: ${windSpeed} from ${windDirection}${conditions.windGusts ? `, gusts ${Math.round(parseFloat(conditions.windGusts))} mph` : ""}`,
    `- Tide: ${conditions.tideStatus || "unknown"}${conditions.tideHeight ? ` at ${parseFloat(conditions.tideHeight).toFixed(1)} ft` : ""}`,
    `- Water temp: ${conditions.waterTemp ? `${parseFloat(conditions.waterTemp).toFixed(0)}°F` : "unknown"}`,
    conditions.primaryBuoy ? buoyLine("Primary buoy", conditions.primaryBuoy) : null,
    conditions.backupBuoy ? buoyLine("Backup buoy", conditions.backupBuoy) : null,
  ]
    .filter(Boolean)
    .join("\n") as string;
}
