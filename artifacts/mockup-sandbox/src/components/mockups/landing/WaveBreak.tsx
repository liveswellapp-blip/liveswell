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

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, padding: "72px 48px 64px", alignItems: "center", maxWidth: 1280, margin: "0 auto" }}>
        
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
          
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 440 }}>
            Real-time surf conditions from 1,355+ NOAA buoys worldwide. Wave heights, swell periods, tides, and wind — all in one place.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
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

        {/* Right — Mock App Preview */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -40, background: "radial-gradient(ellipse at center, rgba(52,211,153,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          
          {/* Mock conditions card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24, backdropFilter: "blur(10px)" }}>
            {/* Card header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>📍 Jeffreys Bay, South Africa</span>
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Live</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, margin: "8px 0 20px", letterSpacing: "-0.5px" }}>Jeffreys Bay</div>

            {/* Wave stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(52,211,153,0.2)" }}>
                <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>🌊 MARINE FORECAST</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "white", marginBottom: 4 }}>Open-Meteo Marine</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Global wave model</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>10.0</span>
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>ft</span>
                  <span style={{ fontSize: 11, color: "#059669" }}>· 8s · SSE</span>
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(6,182,212,0.2)" }}>
                <div style={{ fontSize: 9, color: "#22d3ee", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>💨 WIND</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>OpenWeatherMap</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>23</span>
                  <span style={{ fontSize: 12, color: "#0891b2", fontWeight: 600 }}>mph</span>
                  <span style={{ fontSize: 11, color: "#0891b2" }}>· ESE</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Gusts 29 mph</div>
              </div>
            </div>

            {/* Forecast row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {[
                { day: "Mon", ft: "15.0", dir: "SW" },
                { day: "Tue", ft: "11.1", dir: "SSW" },
                { day: "Wed", ft: "5.7", dir: "S" },
                { day: "Thu", ft: "3.2", dir: "SE" },
                { day: "Fri", ft: "2.4", dir: "SE" },
              ].map(d => (
                <div key={d.day} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 4px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{d.day}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>{d.ft}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>ft · {d.dir}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 48px", display: "flex", gap: 0 }}>
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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 48px" }}>
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
        Data: NOAA NDBC · OpenWeatherMap · Open-Meteo Marine · NOAA Tides & Currents
      </div>
    </div>
  );
}
