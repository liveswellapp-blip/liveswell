const colors = [
  { group: "Backgrounds", swatches: [
    { hex: "#030a14", name: "Deep Navy" },
    { hex: "#030912", name: "Near Black" },
    { hex: "#091a35", name: "Dark Navy" },
    { hex: "#041a2e", name: "Navy Overlay" },
    { hex: "#0d0d0d", name: "Off Black" },
  ]},
  { group: "Brand Green", swatches: [
    { hex: "#34d399", name: "Emerald 300" },
    { hex: "#10b981", name: "Emerald 500" },
    { hex: "#059669", name: "Emerald 600" },
    { hex: "#065f46", name: "Emerald 800" },
    { hex: "#022c22", name: "Emerald 950" },
  ]},
  { group: "Cyan / Blue", swatches: [
    { hex: "#67e8f9", name: "Cyan 300" },
    { hex: "#22d3ee", name: "Cyan 400" },
    { hex: "#0891b2", name: "Cyan 600" },
    { hex: "#7dd3fc", name: "Sky 300" },
    { hex: "#38bdf8", name: "Sky 400" },
  ]},
  { group: "Gold / Amber", swatches: [
    { hex: "#fbbf24", name: "Amber 400" },
    { hex: "#f59e0b", name: "Amber 500" },
    { hex: "#d97706", name: "Amber 600" },
    { hex: "#b45309", name: "Amber 700" },
  ]},
  { group: "Text / UI", swatches: [
    { hex: "#ffffff", name: "White" },
    { hex: "#e2e8f0", name: "Slate 200" },
    { hex: "#94a3b8", name: "Slate 400" },
    { hex: "#64748b", name: "Slate 500" },
    { hex: "#475569", name: "Slate 600" },
    { hex: "#334155", name: "Slate 700" },
  ]},
  { group: "Danger", swatches: [
    { hex: "#f87171", name: "Red 400" },
    { hex: "#fb923c", name: "Orange 400" },
  ]},
];

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export default function ColorPalette() {
  const copy = (hex: string) => navigator.clipboard?.writeText(hex);

  return (
    <div style={{
      background: "#030a14",
      minHeight: "100vh",
      padding: "28px 24px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>LiveSwell</p>
        <h1 style={{ color: "#ffffff", fontSize: 18, fontWeight: 800, margin: "4px 0 0" }}>Color Palette</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {colors.map((group) => (
          <div key={group.group}>
            <p style={{ color: "#475569", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              {group.group}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {group.swatches.map((s) => (
                <button
                  key={s.hex}
                  onClick={() => copy(s.hex)}
                  title={`Click to copy ${s.hex}`}
                  style={{
                    width: 90,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 10,
                    background: s.hex,
                    border: s.hex === "#030a14" || s.hex === "#030912" ? "1px solid rgba(255,255,255,0.1)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: isLight(s.hex) ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.5)",
                      letterSpacing: "0.05em",
                    }}>COPY</span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 9, fontWeight: 600, margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </p>
                  <p style={{ color: "#64748b", fontSize: 9, fontFamily: "monospace", margin: 0 }}>
                    {s.hex}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: "#1e3a5f", fontSize: 9, marginTop: 24 }}>Click any swatch to copy the hex to clipboard</p>
    </div>
  );
}
