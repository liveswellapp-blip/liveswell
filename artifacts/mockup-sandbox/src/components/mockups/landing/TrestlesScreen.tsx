export default function TrestlesScreen() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, minHeight: 844, color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* App header */}
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.3px" }}>
          <span style={{ color: "#34d399" }}>LIVE</span>
          <span style={{ color: "white" }}> SWELL</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#030a14" }}>JD</div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "10px 18px 6px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Search surf spots...</span>
        </div>
      </div>

      {/* Location + breadcrumb */}
      <div style={{ padding: "8px 18px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📍 San Clemente, CA</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "2px 8px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
            <span style={{ fontSize: 9, color: "#34d399", fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>Trestles</div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.3)" }}>⭐</div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Point Break · Advanced · Optimal: S-SW swell, NE winds</div>
      </div>

      {/* Conditions grid */}
      <div style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "14px", border: "1px solid rgba(52,211,153,0.22)" }}>
          <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌊 WAVES</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>4.8</span>
            <span style={{ fontSize: 13, color: "#059669", fontWeight: 700 }}>ft</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>14s · SW swell</div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "14px", border: "1px solid rgba(6,182,212,0.22)" }}>
          <div style={{ fontSize: 9, color: "#22d3ee", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>💨 WIND</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>8</span>
            <span style={{ fontSize: 13, color: "#0891b2", fontWeight: 700 }}>mph</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>NNE · offshore 🤙</div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "14px", border: "1px solid rgba(99,102,241,0.22)" }}>
          <div style={{ fontSize: 9, color: "#a5b4fc", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌙 TIDE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#a5b4fc", lineHeight: 1 }}>1.2</span>
            <span style={{ fontSize: 13, color: "#818cf8", fontWeight: 700 }}>ft</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>Low · rising ↑ 1:15pm</div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "14px", border: "1px solid rgba(251,191,36,0.22)" }}>
          <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌡 WATER</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>65</span>
            <span style={{ fontSize: 13, color: "#d97706", fontWeight: 700 }}>°F</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>Springsuit ok</div>
        </div>
      </div>

      {/* AI Surf Summary */}
      <div style={{ margin: "0 18px 10px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700, letterSpacing: "0.06em" }}>AI SURF SUMMARY</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
          Overhead+ NNE offshore wind grooming a solid 4–5 ft SW groundswell at Uppers. Low tide push at 6:42am makes the point fire. Glassy, long walls — don't miss this one.
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>7-Day Forecast</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {[
            { day: "MON", ft: "4.8", good: true },
            { day: "TUE", ft: "5.2", good: true },
            { day: "WED", ft: "3.6", good: false },
            { day: "THU", ft: "2.4", good: false },
            { day: "FRI", ft: "3.9", good: false },
            { day: "SAT", ft: "4.1", good: true },
            { day: "SUN", ft: "3.3", good: false },
          ].map(d => (
            <div key={d.day} style={{ background: d.good ? "rgba(52,211,153,0.09)" : "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 2px", textAlign: "center", border: `1px solid ${d.good ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.05)"}` }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{d.day}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: d.good ? "#34d399" : "rgba(255,255,255,0.6)" }}>{d.ft}</div>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>ft</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tide times strip */}
      <div style={{ margin: "0 18px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 0 }}>
        {[
          { label: "Low", time: "6:42am", ft: "0.8ft" },
          { label: "High", time: "1:15pm", ft: "4.8ft" },
          { label: "Low", time: "7:31pm", ft: "1.2ft" },
        ].map((t, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{t.time}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{t.ft}</div>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", padding: "10px 18px 20px", background: "#030a14" }}>
        {[
          { icon: "🔍", label: "Explore", active: false },
          { icon: "🌊", label: "Conditions", active: true },
          { icon: "⭐", label: "Favorites", active: false },
          { icon: "👤", label: "Profile", active: false },
        ].map(t => (
          <div key={t.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
            <div style={{ fontSize: 9, color: t.active ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: t.active ? 700 : 400 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
