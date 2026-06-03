import { Clock, Waves } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";
const CARD = "rgba(0,0,0,0.35)";

function BuoyCard({
  index, sublabel, station, stationId, height, period, direction, showHistory,
}: {
  index: number; sublabel: string; station: string; stationId: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  return (
    <div style={{ background: CARD, border: "1px solid rgba(16,185,129,0.25)", borderRadius: 14, padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Waves size={12} color="#34d399" />
          <span style={{ color: "#34d399", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Swell Report · {index === 1 ? "Primary" : "Secondary"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 9 }}>Live</span>
        </div>
      </div>

      <p style={{ color: "#94a3b8", fontSize: 9, marginBottom: 2 }}>{sublabel}</p>
      <p style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 12, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{station}</p>

      {/* 3-column data grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "HEIGHT", value: height, unit: "ft" },
          { label: "PERIOD", value: period, unit: "sec" },
          { label: "DIR", value: direction, unit: "" },
        ].map(m => (
          <div key={m.label} style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5 }}>{m.label}</p>
            <p style={{ color: "#34d399", fontWeight: 900, fontSize: m.label === "DIR" ? 15 : 22, lineHeight: 1 }}>{m.value}</p>
            {m.unit && <p style={{ color: "#64748b", fontSize: 8, marginTop: 3 }}>{m.unit}</p>}
          </div>
        ))}
      </div>

      {showHistory && (
        <button style={{ width: "100%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "7px 0", color: "#34d399", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
          Wave History
        </button>
      )}
    </div>
  );
}

export function SwellReport() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 358, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 18 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BuoyCard index={1} sublabel="Closest offshore station" station="St. Augustine, FL (194)" stationId="41117" height="6.6" period="7s" direction="NE" showHistory />
          <BuoyCard index={2} sublabel="Backup offshore station" station="Offshore Fernandina Beach, FL" stationId="41112" height="5.6" period="6s" direction="ENE" showHistory />
        </div>
      </div>
    </div>
  );
}
