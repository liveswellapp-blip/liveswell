export default function WaveBreak() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white", overflowX: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
          <span style={{ color: "#34d399" }}>LIVE</span>
          <span style={{ color: "white" }}> SWELL</span>
        </div>
        <button style={{ background: "#34d399", color: "#030a14", border: "none", borderRadius: 8, padding: "8px 20px", fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Sign In
        </button>
      </nav>

      {/* Hero — split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, padding: "64px 48px 56px", alignItems: "center", maxWidth: 1280, margin: "0 auto" }}>

        {/* Left — copy + CTA */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 20, padding: "5px 12px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
            <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>LIVE OCEAN DATA · 218+ SPOTS</span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-1px" }}>
            Read the Ocean.<br />
            <span style={{ color: "#34d399" }}>Catch the</span><br />
            Moment.
          </h1>

          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 440 }}>
            Real-time surf conditions from 1,355+ NOAA buoys worldwide. Wave heights, swell periods, tides, and wind — all in one place.
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 36, flexWrap: "wrap" }}>
            {["218+ Surf Spots", "6 Continents", "Real-time NOAA"].map(label => (
              <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={{ background: "#34d399", color: "#030a14", border: "none", borderRadius: 10, padding: "14px 32px", fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: "-0.2px" }}>
              Sign in with Replit →
            </button>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Free · No credit card needed</span>
          </div>
        </div>

        {/* Right — phone mockup showing logged-in app */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          {/* Glow behind phone */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, height: 560, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(52,211,153,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Phone shell */}
          <div style={{
            width: 270,
            borderRadius: 44,
            background: "#161616",
            boxShadow: "0 0 0 2px #252525, 0 0 0 5px #0d0d0d, 0 32px 64px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)",
            padding: "10px 8px",
            position: "relative",
            flexShrink: 0,
          }}>
            {/* Side buttons */}
            <div style={{ position: "absolute", left: -2.5, top: 88, width: 3, height: 28, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: -2.5, top: 126, width: 3, height: 52, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: -2.5, top: 188, width: 3, height: 52, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", right: -2.5, top: 138, width: 3, height: 64, background: "#2a2a2a", borderRadius: "0 2px 2px 0" }} />

            {/* Screen */}
            <div style={{ borderRadius: 36, overflow: "hidden", background: "#030a14", height: 580 }}>

              {/* Status bar */}
              <div style={{ height: 36, background: "#030a14", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", position: "relative" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>9:41</span>
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 6, width: 80, height: 24, background: "#000", borderRadius: 14 }} />
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <svg width="12" height="9" viewBox="0 0 16 12" fill="white" opacity="0.85"><rect x="0" y="3" width="2" height="9" rx="1"/><rect x="4" y="2" width="2" height="10" rx="1"/><rect x="8" y="1" width="2" height="11" rx="1"/><rect x="12" y="0" width="2" height="12" rx="1"/></svg>
                  <div style={{ width: 16, height: 8, border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 2, display: "flex", alignItems: "center", padding: "1px 1.5px", gap: 1 }}>
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                  </div>
                </div>
              </div>

              {/* App header — logged in */}
              <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.3px" }}>
                  <span style={{ color: "#34d399" }}>LIVE</span>
                  <span style={{ color: "white" }}> SWELL</span>
                </div>
                {/* User avatar — logged in */}
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#030a14" }}>
                  JD
                </div>
              </div>

              {/* Location bar */}
              <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10 }}>🔍</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Search spots...</span>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⭐</div>
              </div>

              {/* Spot header */}
              <div style={{ padding: "4px 14px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                  <span style={{ fontSize: 9, color: "#34d399", fontWeight: 600 }}>📍 San Clemente, CA</span>
                  <span style={{ marginLeft: "auto", fontSize: 8, color: "rgba(255,255,255,0.25)", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 4, padding: "1px 5px" }}>LIVE</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>Trestles</div>
              </div>

              {/* Conditions grid */}
              <div style={{ padding: "0 14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {/* Waves */}
                <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: "10px", border: "1px solid rgba(52,211,153,0.2)" }}>
                  <div style={{ fontSize: 7.5, color: "#34d399", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>🌊 WAVES</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>4.8</span>
                    <span style={{ fontSize: 9, color: "#059669", fontWeight: 600 }}>ft</span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>14s · SW swell</div>
                </div>
                {/* Wind */}
                <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: "10px", border: "1px solid rgba(6,182,212,0.2)" }}>
                  <div style={{ fontSize: 7.5, color: "#22d3ee", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>💨 WIND</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>8</span>
                    <span style={{ fontSize: 9, color: "#0891b2", fontWeight: 600 }}>mph</span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>NNE · offshore 🤙</div>
                </div>
                {/* Tide */}
                <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: "10px", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div style={{ fontSize: 7.5, color: "#a5b4fc", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>🌙 TIDE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#a5b4fc", lineHeight: 1 }}>1.2</span>
                    <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600 }}>ft</span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Low · rising ↑</div>
                </div>
                {/* Water temp */}
                <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: "10px", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div style={{ fontSize: 7.5, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>🌡 WATER</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>65</span>
                    <span style={{ fontSize: 9, color: "#d97706", fontWeight: 600 }}>°F</span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Springsuit ok</div>
                </div>
              </div>

              {/* AI summary */}
              <div style={{ margin: "0 14px 10px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ fontSize: 7.5, color: "#34d399", fontWeight: 700, marginBottom: 3, letterSpacing: "0.05em" }}>✨ AI SURF SUMMARY</div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  Overhead+ NNE offshore grooming 4–5 ft SW groundswell. Uppers firing on the low push. Go now.
                </div>
              </div>

              {/* 5-day forecast */}
              <div style={{ padding: "0 14px 12px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                {[
                  { day: "MON", ft: "4.8", good: true },
                  { day: "TUE", ft: "5.2", good: true },
                  { day: "WED", ft: "3.6", good: false },
                  { day: "THU", ft: "2.4", good: false },
                  { day: "FRI", ft: "3.9", good: false },
                ].map(d => (
                  <div key={d.day} style={{ background: d.good ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 7, padding: "6px 3px", textAlign: "center", border: `1px solid ${d.good ? "rgba(52,211,153,0.22)" : "rgba(255,255,255,0.05)"}` }}>
                    <div style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{d.day}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: d.good ? "#34d399" : "rgba(255,255,255,0.55)" }}>{d.ft}</div>
                    <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>ft</div>
                  </div>
                ))}
              </div>

              {/* Bottom tab bar */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", padding: "8px 14px 10px" }}>
                {[
                  { icon: "🔍", label: "Explore", active: false },
                  { icon: "🌊", label: "Conditions", active: true },
                  { icon: "⭐", label: "Favorites", active: false },
                  { icon: "👤", label: "Profile", active: false },
                ].map(t => (
                  <div key={t.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                    <div style={{ fontSize: 7.5, color: t.active ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: t.active ? 700 : 400 }}>{t.label}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 48px", display: "flex" }}>
          {[
            { num: "218+", label: "Surf Spots" },
            { num: "1,355+", label: "NOAA Stations" },
            { num: "6", label: "Continents" },
            { num: "Real-time", label: "Wave Data" },
          ].map((s, i) => (
            <div key={s.num} style={{ flex: 1, textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#34d399" }}>{s.num}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "60px 48px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { icon: "🌊", title: "Global Wave Forecasts", body: "7-day wave height, period, and direction powered by NOAA NWS and Open-Meteo Marine — covering every beach on Earth." },
            { icon: "📍", title: "228+ Curated Spots", body: "From Pipeline to Jeffreys Bay. Advanced, intermediate, and beginner breaks across 6 continents with real-time conditions." },
            { icon: "⭐", title: "Personal Favorites", body: "Save your go-to breaks and get them at a glance. Your personalized surf dashboard, always one tap away." },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 48px 48px", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
        Data sources: NOAA NDBC · OpenWeatherMap · Open-Meteo Marine · NOAA Tides &amp; Currents
      </div>
    </div>
  );
}
