export default function WaveBreakMobile() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#0a0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        .phone-scroll::-webkit-scrollbar { display: none; }
        .phone-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Phone frame */}
      <div style={{
        width: 390,
        borderRadius: 52,
        background: "#1a1a1a",
        boxShadow: "0 0 0 2px #2a2a2a, 0 0 0 6px #111, 0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.07)",
        padding: "12px 10px",
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Side buttons */}
        <div style={{ position: "absolute", left: -3, top: 110, width: 4, height: 36, background: "#333", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -3, top: 158, width: 4, height: 64, background: "#333", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -3, top: 234, width: 4, height: 64, background: "#333", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", right: -3, top: 170, width: 4, height: 80, background: "#333", borderRadius: "0 2px 2px 0" }} />

        {/* Screen */}
        <div style={{ borderRadius: 44, overflow: "hidden", background: "#030a14", position: "relative", height: 844 }}>

          {/* Status bar */}
          <div style={{ height: 44, background: "rgba(3,10,20,0.95)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>9:41</span>
            {/* Dynamic island */}
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 10, width: 120, height: 34, background: "#000", borderRadius: 20 }} />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="white" opacity="0.9"><rect x="0" y="3" width="2" height="9" rx="1"/><rect x="4" y="2" width="2" height="10" rx="1"/><rect x="8" y="1" width="2" height="11" rx="1"/><rect x="12" y="0" width="2" height="12" rx="1"/></svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="white" opacity="0.9"><path d="M8 2C10.8 2 13.3 3.1 15.1 4.9L16 4C13.9 1.9 11.1 0.6 8 0.6C4.9 0.6 2.1 1.9 0 4L0.9 4.9C2.7 3.1 5.2 2 8 2Z"/><path d="M8 5C9.9 5 11.6 5.8 12.8 7L13.7 6.1C12.2 4.6 10.2 3.7 8 3.7C5.8 3.7 3.8 4.6 2.3 6.1L3.2 7C4.4 5.8 6.1 5 8 5Z"/><circle cx="8" cy="9.5" r="1.8"/></svg>
              <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
                <div style={{ width: 22, height: 11, border: "1.5px solid rgba(255,255,255,0.8)", borderRadius: 3, display: "flex", alignItems: "center", padding: "1px 2px", gap: 1 }}>
                  <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1.5 }} />
                  <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1.5 }} />
                  <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1.5 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="phone-scroll" style={{ overflowY: "auto", height: "calc(844px - 44px)", background: "#030a14" }}>

            {/* Nav */}
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.3px" }}>
                <span style={{ color: "#34d399" }}>LIVE</span>
                <span style={{ color: "white" }}> SWELL</span>
              </div>
              <button style={{ background: "#34d399", color: "#030a14", border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: "inherit", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                Sign In
              </button>
            </div>

            {/* Hero */}
            <div style={{ padding: "28px 20px 20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 20, padding: "4px 10px", marginBottom: 18 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
                <span style={{ color: "#34d399", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>LIVE OCEAN DATA · 218+ SPOTS</span>
              </div>

              <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1, margin: "0 0 14px", letterSpacing: "-1px" }}>
                Read the Ocean.<br />
                <span style={{ color: "#34d399" }}>Catch the</span><br />
                Moment.
              </h1>

              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: "0 0 22px" }}>
                Real-time surf conditions from 1,355+ NOAA buoys. Wave heights, swell periods, tides, and wind — all in one place.
              </p>

              <button style={{ width: "100%", background: "#34d399", color: "#030a14", border: "none", borderRadius: 12, padding: "14px", fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                Sign in with Replit →
              </button>
              <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Free · No credit card needed</div>
            </div>

            {/* App preview card — Trestles */}
            <div style={{ margin: "8px 20px 20px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "18px 16px" }}>
                
                {/* Location header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#34d399", fontWeight: 600 }}>📍 San Clemente, CA</span>
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 4, padding: "2px 6px" }}>LIVE</span>
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 16px", letterSpacing: "-0.5px" }}>Trestles</div>

                {/* Condition tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {/* Waves */}
                  <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: "12px", border: "1px solid rgba(52,211,153,0.2)" }}>
                    <div style={{ fontSize: 8, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌊 WAVES</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>4.8</span>
                      <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>ft</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>14s · SW swell</div>
                  </div>
                  {/* Wind */}
                  <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: "12px", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <div style={{ fontSize: 8, color: "#22d3ee", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>💨 WIND</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>8</span>
                      <span style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>mph</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>NNE · offshore 🤙</div>
                  </div>
                  {/* Tide */}
                  <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: "12px", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div style={{ fontSize: 8, color: "#a5b4fc", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌙 TIDE</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#a5b4fc", lineHeight: 1 }}>1.2</span>
                      <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>ft</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Low · rising ↑</div>
                  </div>
                  {/* Water */}
                  <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: "12px", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <div style={{ fontSize: 8, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>🌡 WATER</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>65</span>
                      <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>°F</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Springsuit ok</div>
                  </div>
                </div>

                {/* AI condition summary */}
                <div style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>✨ AI SURF SUMMARY</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
                    Overhead+ NE offshore wind grooming solid 4–5 ft SW groundswell. Low tide push at 6:42am makes Uppers fire. Primo conditions — don't sleep on it.
                  </div>
                </div>

                {/* 5-day forecast */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                  {[
                    { day: "MON", ft: "4.8", good: true },
                    { day: "TUE", ft: "5.2", good: true },
                    { day: "WED", ft: "3.6", good: false },
                    { day: "THU", ft: "2.4", good: false },
                    { day: "FRI", ft: "3.9", good: false },
                  ].map(d => (
                    <div key={d.day} style={{ background: d.good ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 3px", textAlign: "center", border: `1px solid ${d.good ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{d.day}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: d.good ? "#34d399" : "rgba(255,255,255,0.6)" }}>{d.ft}</div>
                      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>ft</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ margin: "0 20px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {[
                { num: "218+", label: "Spots" },
                { num: "1,355+", label: "Buoys" },
                { num: "6", label: "Continents" },
              ].map((s, i) => (
                <div key={s.num} style={{ padding: "16px 8px", textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#34d399" }}>{s.num}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div style={{ margin: "0 20px 24px" }}>
              {[
                { icon: "🌊", title: "Live Wave Forecasts", sub: "NOAA + Open-Meteo Marine data" },
                { icon: "📅", title: "7-Day Forecasts", sub: "Plan your week around the swell" },
                { icon: "🌙", title: "Accurate Tide Charts", sub: "NOAA tides & currents" },
                { icon: "⭐", title: "Save Favorite Spots", sub: "Your personalized surf dashboard" },
              ].map((f, i) => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div style={{ margin: "0 20px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.3px" }}>Ready to check the surf?</div>
              <button style={{ width: "100%", background: "#34d399", color: "#030a14", border: "none", borderRadius: 12, padding: "14px", fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                Sign in with Replit →
              </button>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                NOAA · OpenWeatherMap · Open-Meteo Marine
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
