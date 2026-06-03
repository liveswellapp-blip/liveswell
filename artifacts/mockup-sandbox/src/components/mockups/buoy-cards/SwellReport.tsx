import { Clock, Waves } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";
const CARD = "rgba(0,0,0,0.35)";

function BuoyCard({
  index, station, height, period, direction, showHistory,
}: {
  index: number; station: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  return (
    <div style={{ background: CARD, border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: 11, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Waves size={10} color="#34d399" />
          <span style={{ color: "#34d399", fontWeight: 800, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {index === 1 ? "Primary" : "Secondary"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Clock size={9} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 8 }}>Live</span>
        </div>
      </div>

      <p style={{ color: "#fff", fontWeight: 700, fontSize: 10, marginBottom: 10, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{station}</p>

      {/* 3-column data grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10, flex: 1 }}>
        {[
          { label: "HT", value: height, unit: "ft" },
          { label: "PD", value: period, unit: "" },
          { label: "DIR", value: direction, unit: "" },
        ].map(m => (
          <div key={m.label} style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 7, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 4 }}>{m.label}</p>
            <p style={{ color: "#34d399", fontWeight: 900, fontSize: m.label === "DIR" ? 12 : 18, lineHeight: 1 }}>{m.value}</p>
            {m.unit && <p style={{ color: "#64748b", fontSize: 7, marginTop: 2 }}>{m.unit}</p>}
          </div>
        ))}
      </div>

      {showHistory && (
        <button style={{ width: "100%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 7, padding: "6px 0", color: "#34d399", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
          Wave History
        </button>
      )}
    </div>
  );
}

export function SwellReport() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 358, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>
        {/* Horizontal row */}
        <div style={{ display: "flex", gap: 8 }}>
          <BuoyCard index={1} station="St. Augustine, FL (194)" height="6.6" period="7s" direction="NE" showHistory />
          <BuoyCard index={2} station="Offshore Fernandina, FL" height="5.6" period="6s" direction="ENE" showHistory />
        </div>
      </div>
    </div>
  );
}
