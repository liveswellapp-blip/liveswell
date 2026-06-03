import { Clock, ArrowUpRight, Timer, Compass } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";

function BuoyCard({
  index, station, stationId, height, period, direction, showHistory,
}: {
  index: number; station: string; stationId: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  const metrics = [
    { icon: ArrowUpRight, label: "Height", value: height, unit: "ft", color: "#34d399" },
    { icon: Timer, label: "Period", value: period, color: "#22d3ee" },
    { icon: Compass, label: "Dir", value: direction, color: "#a78bfa" },
  ];

  return (
    <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 11, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 5px #34d399" }} />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 9 }}>Buoy {index}</span>
          </div>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 10, lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{station}</p>
          <p style={{ color: "#475569", fontSize: 8, margin: "2px 0 0" }}>Stn {stationId}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 20, padding: "2px 6px", flexShrink: 0 }}>
          <Clock size={8} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 8 }}>8m</span>
        </div>
      </div>

      {/* Metric rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, marginBottom: showHistory ? 10 : 0 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: `${m.color}14`, border: `1px solid ${m.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <m.icon size={10} color={m.color} />
              </div>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>{m.label}</span>
            </div>
            <span style={{ color: m.color, fontWeight: 800, fontSize: 14 }}>{m.value}{(m as any).unit ? ` ${(m as any).unit}` : ""}</span>
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

export function WaveDataGrid() {
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
