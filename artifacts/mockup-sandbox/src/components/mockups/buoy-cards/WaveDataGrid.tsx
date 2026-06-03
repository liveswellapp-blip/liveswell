import { Clock, ArrowUpRight, Timer, Compass } from "lucide-react";

const DARK = "linear-gradient(160deg, #030912 0%, #091a35 100%)";

function BuoyCard({
  index, station, stationId, height, period, direction, showHistory,
}: {
  index: number; station: string; stationId: string;
  height: string; period: string; direction: string; showHistory?: boolean;
}) {
  const metrics = [
    { icon: ArrowUpRight, label: "Wave Height", value: height, unit: "ft", color: "#34d399" },
    { icon: Timer, label: "Period", value: period, unit: "", color: "#22d3ee" },
    { icon: Compass, label: "Direction", value: direction, unit: "", color: "#a78bfa" },
  ];

  return (
    <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: "0.04em" }}>Live Wave Data · Buoy {index}</span>
          </div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 12, lineHeight: 1.3, margin: 0, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{station}</p>
          <p style={{ color: "#475569", fontSize: 9, margin: "2px 0 0" }}>Station {stationId}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 20, padding: "3px 8px", flexShrink: 0 }}>
          <Clock size={9} color="#64748b" />
          <span style={{ color: "#64748b", fontSize: 9 }}>8 min ago</span>
        </div>
      </div>

      {/* Metric rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: showHistory ? 12 : 0 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 9, padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${m.color}14`, border: `1px solid ${m.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <m.icon size={12} color={m.color} />
              </div>
              <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{m.label}</span>
            </div>
            <span style={{ color: m.color, fontWeight: 800, fontSize: 16 }}>{m.value}{m.unit}</span>
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

export function WaveDataGrid() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#030a14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 358, background: DARK, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18, padding: 18 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>📍 Jacksonville</p>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>Jacksonville Beach</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BuoyCard index={1} station="St. Augustine, FL (194)" stationId="41117" height="6.6" period="7s" direction="NE" showHistory />
          <BuoyCard index={2} station="Offshore Fernandina Beach, FL" stationId="41112" height="5.6" period="6s" direction="ENE" showHistory />
        </div>
      </div>
    </div>
  );
}
