export default function RadialGlow() {
  return (
    <div style={{ background: "#030a14", padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ borderRadius: 20, overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 50% -10%, rgba(16,185,129,0.18) 0%, #040c1a 55%, #030a14 100%)", border: "1px solid rgba(16,185,129,0.18)" }}>
        <div style={{ position: "relative", padding: "20px 20px 20px" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600 }}>📍 Jacksonville</span>
            </div>
            <div style={{ color: "white", fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>Jacksonville Beach</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Buoy #1", name: "St. Augustine, FL (194)", station: "41117", val: "6.6", period: "7s", dir: "ENE" },
              { label: "Buoy #2", name: "Offshore Fernandina...", station: "41112", val: "5.9", period: "7s", dir: "E" },
            ].map(b => (
              <div key={b.label} style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: 12, border: "1px solid rgba(16,185,129,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                  <span style={{ color: "#34d399", fontSize: 10, fontWeight: 700 }}>{b.label}</span>
                </div>
                <div style={{ color: "white", fontSize: 11, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                <div style={{ color: "#64748b", fontSize: 9, marginBottom: 8 }}>Station {b.station}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ color: "#34d399", fontWeight: 900, fontSize: 22 }}>{b.val}</span>
                  <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600 }}>ft · {b.period} · {b.dir}</span>
                </div>
                <div style={{ marginTop: 8, width: "100%", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "4px 0", textAlign: "center", color: "#34d399", fontSize: 9 }}>Wave History</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: 12, border: "1px solid rgba(16,185,129,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "#34d399", fontSize: 10 }}>💨</span>
                <span style={{ color: "#34d399", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Wind</span>
              </div>
              <span style={{ color: "#475569", fontSize: 9 }}>OpenWeatherMap</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ color: "#34d399", fontWeight: 900, fontSize: 22 }}>6</span>
                <span style={{ color: "#34d399", fontSize: 11 }}>mph SE · Gusts 16 mph</span>
              </div>
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "4px 10px", color: "#34d399", fontSize: 9 }}>Wind Forecast</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, textAlign: "center", color: "#475569", fontSize: 11, fontWeight: 600 }}>C · Radial Emerald Glow</div>
    </div>
  );
}
