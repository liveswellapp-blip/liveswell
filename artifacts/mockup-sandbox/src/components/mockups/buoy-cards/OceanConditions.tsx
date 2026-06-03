import { Clock, Navigation } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";

function BuoyCard({
  index, station, stationId, height, period, direction, showHistory,
}: {
  index: number; station: string; stationId: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  return (
    <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 14 }}>
      {/* Label + timestamp */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#34d399", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Ocean Conditions · {index === 1 ? "Primary" : "Secondary"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Clock size={9} color="#475569" />
          <span style={{ color: "#475569", fontSize: 9 }}>8 min ago</span>
        </div>
      </div>

      {/* Station name */}
      <p style={{ color: "#fff", fontWeight: 600, fontSize: 11, lineHeight: 1.3, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{station}</p>
      <p style={{ color: "#475569", fontSize: 9, marginBottom: 10 }}>Station {stationId}</p>

      {/* Big wave height */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 10 }}>
        <span style={{ color: "#34d399", fontWeight: 900, fontSize: 42, lineHeight: 1 }}>{height}</span>
        <span style={{ color: "#34d399", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>ft</span>
      </div>

      {/* Period + Direction pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "4px 10px" }}>
          <span style={{ color: "#64748b", fontSize: 9, fontWeight: 600 }}>PERIOD</span>
          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 800 }}>{period}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "4px 10px" }}>
          <Navigation size={9} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 9, fontWeight: 600 }}>DIR</span>
          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 800 }}>{direction}</span>
        </div>
      </div>

      {showHistory && (
        <button style={{ width: "100%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "5px 0", color: "#34d399", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
          Wave History
        </button>
      )}
    </div>
  );
}

export function OceanConditions() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 680, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 20 }}>

        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <BuoyCard index={1} station="St. Augustine, FL (194)" stationId="41117" height="6.6" period="7s" direction="NE" showHistory />
          <BuoyCard index={2} station="Offshore Fernandina Beach, FL (132)" stationId="41112" height="5.6" period="6s" direction="ENE" showHistory />
        </div>
      </div>
    </div>
  );
}
