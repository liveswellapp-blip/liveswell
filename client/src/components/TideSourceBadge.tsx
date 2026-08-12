/**
 * TideSourceBadge
 *
 * Shows tide data attribution at the bottom of the Tides card.
 *
 *   tideSource = undefined / plain station name   → "NOAA Tides & Currents data"
 *   tideSource = "estimated"                      → amber "Estimated (no station mapped)" badge
 *   tideSource = "<name> (unavailable)"           → amber "Estimated (station temporarily unavailable)" badge
 */
export default function TideSourceBadge({ tideSource }: { tideSource: string | undefined }) {
  if (tideSource && (tideSource === "estimated" || tideSource.includes("(unavailable)"))) {
    const isUnavailable = tideSource.includes("(unavailable)");
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
        title={
          isUnavailable
            ? `Tide station ${tideSource.replace(" (unavailable)", "")} is temporarily unavailable — showing estimated tides`
            : "No NOAA tide station is mapped for this location — showing estimated tides"
        }
      >
        <span>⚠</span>
        <span>
          {isUnavailable
            ? "Estimated (station temporarily unavailable)"
            : "Estimated (no station mapped)"}
        </span>
      </span>
    );
  }

  return (
    <span className="text-slate-600 text-[10px]">NOAA Tides &amp; Currents data</span>
  );
}
