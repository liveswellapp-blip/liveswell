import { Clock, Navigation } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";

function BuoyCard({
  index, station, stationId, height, period, direction, showHistory,
}: {
  index: number; station: string; stationId: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  return (
    <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 11, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Label + timestamp */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#34d399", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {index === 1 ? "Primary" : "Secondary"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Clock size={8} color="#475569" />
          <span style={{ color: "#475569", fontSize: 8 }}>8m ago</span>
        </div>
      </div>

      {/* Station */}
      <p style={{ color: "#fff", fontWeight: 600, fontSize: 10, lineHeight: 1.2, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{station}</p>
      <p style={{ color: "#475569", fontSize: 8, marginBottom: 10 }}>Stn {stationId}</p>

      {/* Big wave height */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 10 }}>
        <span style={{ color: "#34d399", fontWeight: 900, fontSize: 42, lineHeight: 1 }}>{height}</span>
        <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13, marginBottom: 5 }}>ft</span>
      </div>

      {/* Period + Direction stacked, no border */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: showHistory ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.08)", borderRadius: 20, padding: "5px 10px" }}>
          <span style={{ color: "#64748b", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em" }}>PERIOD</span>
          <span style={{ color: "#34d399", fontSize: 13, fontWeight: 900 }}>{period}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.08)", borderRadius: 20, padding: "5px 10px" }}>
          <span style={{ color: "#64748b", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em" }}>Direction</span>
          <span style={{ color: "#34d399", fontSize: 13, fontWeight: 900 }}>{direction}</span>
        </div>
      </div>

      {showHistory && (
        <button style={{ width: "100%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 7, padding: "6px 0", color: "#34d399", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
          Wave History
        </button>
      )}
    </div>
  );
}

export function OceanConditions() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 358, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BuoyCard index={1} station="St. Augustine, FL (194)" stationId="41117" height="6.6" period="7s" direction="NE" showHistory />
          <BuoyCard index={2} station="Offshore Fernandina, FL" stationId="41112" height="5.6" period="6s" direction="ENE" showHistory />
        </div>
      </div>
    </div>
  );
}
