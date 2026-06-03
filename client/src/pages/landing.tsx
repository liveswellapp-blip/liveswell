import logoImage from "@assets/Live_(1500_x_500_px)_(1)_1780500060904.png";

const SCALE = 264 / 390;

function PhoneScreen() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, color: "white", display: "flex", flexDirection: "column" }}>
      {/* App header */}
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.3px" }}>
          <span style={{ color: "#34d399" }}>LIVE</span>
          <span style={{ color: "white" }}> SWELL</span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#030a14" }}>
          JD
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "10px 18px 6px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Search surf spots...</span>
        </div>
      </div>

      {/* Location + spot name */}
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
          <div style={{ fontSize: 18, color: "#fbbf24" }}>⭐</div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Point Break · Advanced · S-SW swell, NE winds</div>
      </div>

      {/* 2×2 condition tiles */}
      <div style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "🌊 WAVES",  val: "4.8", unit: "ft",  sub: "14s · SW swell",      color: "#34d399", border: "rgba(52,211,153,0.22)",  unitColor: "#059669" },
          { label: "💨 WIND",   val: "8",   unit: "mph", sub: "NNE · offshore 🤙",   color: "#22d3ee", border: "rgba(6,182,212,0.22)",    unitColor: "#0891b2" },
          { label: "🌙 TIDE",   val: "1.2", unit: "ft",  sub: "Low · rising ↑ 1:15pm", color: "#a5b4fc", border: "rgba(99,102,241,0.22)", unitColor: "#818cf8" },
          { label: "🌡 WATER",  val: "65",  unit: "°F",  sub: "Springsuit ok",        color: "#fbbf24", border: "rgba(251,191,36,0.22)",  unitColor: "#d97706" },
        ].map(tile => (
          <div key={tile.label} style={{ background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "14px", border: `1px solid ${tile.border}` }}>
            <div style={{ fontSize: 9, color: tile.color, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{tile.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 34, fontWeight: 900, color: tile.color, lineHeight: 1 }}>{tile.val}</span>
              <span style={{ fontSize: 13, color: tile.unitColor, fontWeight: 700 }}>{tile.unit}</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{tile.sub}</div>
          </div>
        ))}
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

      {/* 7-day forecast */}
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>7-Day Forecast</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {[
            { day: "MON", ft: "4.8", good: true  },
            { day: "TUE", ft: "5.2", good: true  },
            { day: "WED", ft: "3.6", good: false },
            { day: "THU", ft: "2.4", good: false },
            { day: "FRI", ft: "3.9", good: false },
            { day: "SAT", ft: "4.1", good: true  },
            { day: "SUN", ft: "3.3", good: false },
          ].map(d => (
            <div key={d.day} style={{ background: d.good ? "rgba(52,211,153,0.09)" : "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 2px", textAlign: "center" as const, border: `1px solid ${d.good ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.05)"}` }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{d.day}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: d.good ? "#34d399" : "rgba(255,255,255,0.6)" }}>{d.ft}</div>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>ft</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tide times */}
      <div style={{ margin: "0 18px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", display: "flex" }}>
        {[
          { label: "Low",  time: "6:42am", ft: "0.8ft" },
          { label: "High", time: "1:15pm", ft: "4.8ft" },
          { label: "Low",  time: "7:31pm", ft: "1.2ft" },
        ].map((t, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" as const, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{t.time}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{t.ft}</div>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", padding: "10px 18px 20px", background: "#030a14" }}>
        {[
          { icon: "🔍", label: "Explore",    active: false },
          { icon: "🌊", label: "Conditions", active: true  },
          { icon: "⭐", label: "Favorites",  active: false },
          { icon: "👤", label: "Profile",    active: false },
        ].map(t => (
          <div key={t.label} style={{ flex: 1, textAlign: "center" as const }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
            <div style={{ fontSize: 9, color: t.active ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: t.active ? 700 : 400 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white", overflowX: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <img src={logoImage} alt="LiveSwell" style={{ height: 36, objectFit: "contain" }} />
        <button
          onClick={handleLogin}
          style={{ background: "#34d399", color: "#030a14", border: "none", borderRadius: 8, padding: "8px 20px", fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          Sign In
        </button>
      </nav>

      {/* Hero — split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, padding: "64px 48px 56px", alignItems: "center", maxWidth: 1280, margin: "0 auto" }}>

        {/* Left */}
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

          <div style={{ display: "flex", gap: 10, marginBottom: 36, flexWrap: "wrap" as const }}>
            {["218+ Surf Spots", "6 Continents", "Real-time NOAA"].map(label => (
              <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={handleLogin}
              style={{ background: "#34d399", color: "#030a14", border: "none", borderRadius: 10, padding: "14px 32px", fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              Sign in with Replit →
            </button>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Free · No credit card needed</span>
          </div>
        </div>

        {/* Right — phone mockup */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          {/* Emerald glow */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, height: 580, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(52,211,153,0.11) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Phone shell */}
          <div style={{ width: 280, borderRadius: 46, background: "#161616", boxShadow: "0 0 0 2px #262626, 0 0 0 5px #0d0d0d, 0 36px 72px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.07)", padding: "10px 8px", position: "relative", flexShrink: 0 }}>
            {/* Side buttons */}
            <div style={{ position: "absolute", left: -2.5, top: 90,  width: 3, height: 30, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: -2.5, top: 130, width: 3, height: 55, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: -2.5, top: 196, width: 3, height: 55, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", right: -2.5, top: 145, width: 3, height: 70, background: "#2a2a2a", borderRadius: "0 2px 2px 0" }} />

            {/* Screen */}
            <div style={{ borderRadius: 38, overflow: "hidden", background: "#030a14", position: "relative" }}>
              {/* Status bar */}
              <div style={{ height: 38, background: "#030a14", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "relative", zIndex: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>9:41</span>
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 7, width: 86, height: 26, background: "#000", borderRadius: 15 }} />
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <svg width="12" height="9" viewBox="0 0 16 12" fill="white" opacity={0.85}>
                    <rect x="0" y="3" width="2" height="9" rx="1"/>
                    <rect x="4" y="2" width="2" height="10" rx="1"/>
                    <rect x="8" y="1" width="2" height="11" rx="1"/>
                    <rect x="12" y="0" width="2" height="12" rx="1"/>
                  </svg>
                  <div style={{ width: 17, height: 9, border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 2.5, display: "flex", alignItems: "center", padding: "1px 1.5px", gap: 1 }}>
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                    <div style={{ flex: 1, height: "100%", background: "#34d399", borderRadius: 1 }} />
                  </div>
                </div>
              </div>

              {/* Scaled app screen */}
              <div style={{ width: 264, height: 570, overflow: "hidden" }}>
                <div style={{ width: 390, transformOrigin: "top left", transform: `scale(${SCALE})`, pointerEvents: "none" }}>
                  <PhoneScreen />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 48px", display: "flex" }}>
          {[
            { num: "218+",      label: "Surf Spots"     },
            { num: "1,355+",    label: "NOAA Stations"  },
            { num: "6",         label: "Continents"     },
            { num: "Real-time", label: "Wave Data"      },
          ].map((s, i) => (
            <div key={s.num} style={{ flex: 1, textAlign: "center" as const, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
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
            { icon: "📍", title: "228+ Curated Spots",    body: "From Pipeline to Jeffreys Bay. Advanced, intermediate, and beginner breaks across 6 continents with real-time conditions." },
            { icon: "⭐", title: "Personal Favorites",    body: "Save your go-to breaks and get them at a glance. Your personalized surf dashboard, always one tap away." },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "0 48px 48px", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
        Data sources: NOAA NDBC · OpenWeatherMap · Open-Meteo Marine · NOAA Tides &amp; Currents
      </div>
    </div>
  );
}
