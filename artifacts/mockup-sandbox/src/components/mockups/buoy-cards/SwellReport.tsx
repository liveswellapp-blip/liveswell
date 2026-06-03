import { Clock, Waves } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";
const CARD = "rgba(0,0,0,0.35)";

function BuoyCard({
  label, sublabel, station, height, period, direction, showHistory, onHistory,
}: {
  label: string; sublabel: string; station: string;
  height: string; period: string; direction: string;
  showHistory?: boolean; onHistory?: () => void;
}) {
  return (
    <div style={{ background: CARD, border: "1px solid rgba(16,185,129,0.25)", borderRadius: 14, padding: 14, flex: 1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Waves size={12} color="#34d399" />
          <span style={{ color: "#34d399", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 9 }}>Live</span>
        </div>
      </div>

      <p style={{ color: "#94a3b8", fontSize: 9, marginBottom: 2 }}>{sublabel}</p>
      <p style={{ color: "#fff", fontWeight: 700, fontSize: 11, marginBottom: 10, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{station}</p>

      {/* 3-column data grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        {[
          { label: "HEIGHT", value: height, unit: "ft" },
          { label: "PERIOD", value: period, unit: "sec" },
          { label: "DIRECTION", value: direction, unit: "" },
        ].map(m => (
          <div key={m.label} style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 8, padding: "7px 6px", textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>{m.label}</p>
            <p style={{ color: "#34d399", fontWeight: 900, fontSize: m.label === "DIRECTION" ? 13 : 18, lineHeight: 1 }}>{m.value}</p>
            {m.unit && <p style={{ color: "#64748b", fontSize: 8, marginTop: 2 }}>{m.unit}</p>}
          </div>
        ))}
      </div>

      {showHistory && (
        <button style={{ width: "100%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "5px 0", color: "#34d399", fontSize: 9, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>
          Wave History
        </button>
      )}
    </div>
  );
}

export function SwellReport() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 680, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 20 }}>

        {/* Location */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>

        {/* Two buoy cards */}
        <div style={{ display: "flex", gap: 10 }}>
          <BuoyCard
            label="Swell Report · Primary"
            sublabel="Closest offshore station"
            station="St. Augustine, FL (194)"
            height="6.6" period="7s" direction="NE"
            showHistory
          />
          <BuoyCard
            label="Swell Report · Secondary"
            sublabel="Backup offshore station"
            station="Offshore Fernandina Beach, FL (132)"
            height="5.6" period="6s" direction="ENE"
            showHistory
          />
        </div>
      </div>
    </div>
  );
}
