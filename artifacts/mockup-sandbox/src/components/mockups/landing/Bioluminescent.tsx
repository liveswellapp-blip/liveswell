export default function Bioluminescent() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Background glow blobs */}
      <div style={{ position: "fixed", top: -100, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -100, right: -100, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "60%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌊</div>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.3px" }}>
            <span style={{ color: "#34d399" }}>Live</span>
            <span style={{ color: "white" }}>Swell</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "8px 18px", fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Sign In
          </button>
          <button style={{ background: "linear-gradient(135deg, #34d399, #059669)", color: "#030a14", border: "none", borderRadius: 8, padding: "8px 18px", fontFamily: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 48px 56px", position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto" }}>

        {/* Live badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 20, padding: "6px 16px", marginBottom: 28 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
          <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>LIVE CONDITIONS · 218 SPOTS WORLDWIDE</span>
        </div>

        <h1 style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.0, margin: "0 0 24px", letterSpacing: "-2px" }}>
          <span style={{ background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>The ocean speaks.</span><br />
          <span style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>We translate.</span>
        </h1>

        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 auto 40px", maxWidth: 500 }}>
          Real-time wave heights, swell data, and 7-day forecasts from 1,355+ NOAA buoys. Built for surfers who don't guess.
        </p>

        {/* CTA group */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 48 }}>
          <button style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)", color: "#030a14", border: "none", borderRadius: 12, padding: "16px 44px", fontFamily: "inherit", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 8px 32px rgba(52,211,153,0.3), 0 0 80px rgba(52,211,153,0.1)" }}>
            Sign in with Replit
          </button>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Free · Always</div>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["🌊 218+ Surf Spots", "📡 1,355+ NOAA Buoys", "🌍 6 Continents", "📅 7-Day Forecasts", "🌙 Tide Charts"].map(pill => (
            <div key={pill} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
              {pill}
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards row */}
      <div style={{ padding: "0 48px 60px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
          {[
            { gradient: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)", icon: "🌊", title: "Wave Intelligence", body: "NOAA buoy data + Open-Meteo Marine. Wave height, period, and swell direction for every beach on Earth." },
            { gradient: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.15)", icon: "💨", title: "Wind & Weather", body: "Real-time wind speed, direction, and gusts from OpenWeatherMap. Know if it's glassy before you wax up." },
            { gradient: "rgba(251,191,36,0.04)", border: "rgba(251,191,36,0.1)", icon: "🌙", title: "Tides & Timing", body: "Accurate NOAA tide predictions. High and low tide times so you hit the break at its best." },
          ].map(f => (
            <div key={f.title} style={{ background: f.gradient, border: `1px solid ${f.border}`, borderRadius: 16, padding: "24px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{f.body}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[
            { gradient: "rgba(52,211,153,0.04)", border: "rgba(52,211,153,0.1)", icon: "📍", title: "228+ Curated Breaks", body: "Pipeline. J-Bay. Hossegor. Uluwatu. Every legendary break with live data, break type, and difficulty rating." },
            { gradient: "rgba(139,92,246,0.04)", border: "rgba(139,92,246,0.1)", icon: "⭐", title: "Your Personalized Dashboard", body: "Save your home breaks, build your favorites list, and see all your spots at a glance every session." },
          ].map(f => (
            <div key={f.title} style={{ background: f.gradient, border: `1px solid ${f.border}`, borderRadius: 16, padding: "24px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div style={{ background: "rgba(52,211,153,0.04)", borderTop: "1px solid rgba(52,211,153,0.1)", padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>Ready to check the surf?</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Free access · No credit card required</div>
        </div>
        <button style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)", color: "#030a14", border: "none", borderRadius: 10, padding: "14px 32px", fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 20px rgba(52,211,153,0.3)" }}>
          Sign in with Replit →
        </button>
      </div>
    </div>
  );
}
