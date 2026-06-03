export default function DeepOcean() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Subtle radial glow top center */}
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ padding: "24px 64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
          LiveSwell
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginRight: 8 }}>Already a member?</span>
          <button style={{ background: "transparent", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)", borderRadius: 8, padding: "8px 18px", fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero — centered */}
      <div style={{ textAlign: "center", padding: "80px 64px 72px", maxWidth: 900, margin: "0 auto" }}>
        
        {/* Eyebrow */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 20, height: 1, background: "#34d399" }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#34d399", textTransform: "uppercase" }}>Real-time surf intelligence</span>
          <div style={{ width: 20, height: 1, background: "#34d399" }} />
        </div>

        <h1 style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.0, margin: "0 0 28px", letterSpacing: "-2px" }}>
          Know before<br />
          <span style={{ color: "#34d399" }}>you paddle out.</span>
        </h1>
        
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 0 48px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          Wave heights, swell periods, tides, and wind conditions updated live from 1,355+ NOAA buoys — for 218+ surf spots across 6 continents.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 48 }}>
          <button style={{ background: "#10b981", color: "white", border: "none", borderRadius: 12, padding: "16px 40px", fontFamily: "inherit", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}>
            Get Started — It's Free
          </button>
        </div>

        {/* Trust line */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center" }}>
          {["NOAA", "OpenWeatherMap", "Open-Meteo Marine"].map((src, i) => (
            <span key={src} style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
              {i > 0 && <span style={{ marginRight: 24, color: "rgba(255,255,255,0.1)" }}>·</span>}
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* Divider with stats */}
      <div style={{ maxWidth: 900, margin: "0 auto 72px", padding: "0 64px" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { num: "218+", label: "Surf Spots" },
            { num: "1,355+", label: "NOAA Buoys" },
            { num: "6", label: "Continents" },
            { num: "7-Day", label: "Forecasts" },
          ].map((s, i) => (
            <div key={s.num} style={{ padding: "28px 0", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>{s.num}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 64px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Everything you need</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>Built for surfers who want the truth.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: "🌊", title: "Live Wave Data", body: "NOAA buoy readings updated every hour. No guessing — real sensor data from the ocean." },
            { icon: "🌬️", title: "Wind & Swell", body: "Full wind direction, speed, gusts, and swell period so you know if conditions are glassy or blown out." },
            { icon: "🌙", title: "Tide Charts", body: "Accurate NOAA tide predictions with high and low times. Know when the bank is working." },
            { icon: "📅", title: "7-Day Forecast", body: "Plan your week with daily swell forecasts from NOAA NWS and Open-Meteo Marine." },
            { icon: "📍", title: "Global Coverage", body: "Pipeline, J-Bay, Hossegor, Uluwatu — conditions for iconic breaks worldwide." },
            { icon: "⭐", title: "Save Favorites", body: "Star your local spots for instant access. Your personalized surf lineup." },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "22px 20px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", padding: "48px 64px 64px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.5px" }}>Ready to check the surf?</div>
        <button style={{ background: "#10b981", color: "white", border: "none", borderRadius: 12, padding: "16px 40px", fontFamily: "inherit", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Sign in with Replit →
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Data: NOAA NDBC · OpenWeatherMap · Open-Meteo Marine · Tides & Currents
        </div>
      </div>
    </div>
  );
}
