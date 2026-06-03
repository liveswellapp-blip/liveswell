import logoImage from "@assets/Live_(1500_x_500_px)_(1)_1780500060904.png";

const SCALE = 264 / 390;

function PhoneScreen() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, color: "white", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.3px" }}>
          <span style={{ color: "#34d399" }}>LIVE</span><span style={{ color: "white" }}> SWELL</span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#030a14" }}>JD</div>
      </div>
      <div style={{ padding: "10px 18px 6px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Search surf spots...</span>
        </div>
      </div>
      <div style={{ padding: "8px 18px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📍 San Clemente, CA</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "2px 8px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} /><span style={{ fontSize: 9, color: "#34d399", fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>Trestles</div>
          <div style={{ fontSize: 18, color: "#fbbf24" }}>⭐</div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Point Break · Advanced · S-SW swell, NE winds</div>
      </div>
      <div style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "🌊 WAVES", val: "4.8", unit: "ft",  sub: "14s · SW swell",        color: "#34d399", border: "rgba(52,211,153,0.22)",  unitColor: "#059669" },
          { label: "💨 WIND",  val: "8",   unit: "mph", sub: "NNE · offshore 🤙",     color: "#22d3ee", border: "rgba(6,182,212,0.22)",    unitColor: "#0891b2" },
          { label: "🌙 TIDE",  val: "1.2", unit: "ft",  sub: "Low · rising ↑ 1:15pm", color: "#a5b4fc", border: "rgba(99,102,241,0.22)",  unitColor: "#818cf8" },
          { label: "🌡 WATER", val: "65",  unit: "°F",  sub: "Springsuit ok",          color: "#fbbf24", border: "rgba(251,191,36,0.22)",  unitColor: "#d97706" },
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
      <div style={{ margin: "0 18px 10px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700, letterSpacing: "0.06em" }}>AI SURF SUMMARY</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
          Overhead+ NNE offshore wind grooming a solid 4–5 ft SW groundswell at Uppers. Low tide push at 6:42am makes the point fire. Glassy, long walls — don't miss this one.
        </div>
      </div>
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>7-Day Forecast</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {[
            { day: "MON", ft: "4.8", good: true  }, { day: "TUE", ft: "5.2", good: true  },
            { day: "WED", ft: "3.6", good: false }, { day: "THU", ft: "2.4", good: false },
            { day: "FRI", ft: "3.9", good: false }, { day: "SAT", ft: "4.1", good: true  },
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
      <div style={{ margin: "0 18px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", display: "flex" }}>
        {[{ label: "Low", time: "6:42am", ft: "0.8ft" }, { label: "High", time: "1:15pm", ft: "4.8ft" }, { label: "Low", time: "7:31pm", ft: "1.2ft" }].map((t, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" as const, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{t.time}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{t.ft}</div>
          </div>
        ))}
      </div>
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
  const handleLogin = () => { window.location.href = "/api/login"; };

  return (
    <div className="landing-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        .landing-root {
          font-family: 'Poppins', sans-serif;
          background: #030a14;
          min-height: 100vh;
          color: white;
          overflow-x: hidden;
        }

        /* ── Nav ───────────────────────────────────────────── */
        .landing-nav {
          padding: 16px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .landing-nav img { height: 36px; object-fit: contain; }
        .landing-nav-btn {
          background: #34d399; color: #030a14; border: none;
          border-radius: 8px; padding: 8px 20px;
          font-family: inherit; font-weight: 700; font-size: 13px; cursor: pointer;
        }

        /* ── Hero ──────────────────────────────────────────── */
        .landing-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          padding: 64px 48px 56px;
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
        }
        .landing-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25);
          border-radius: 20px; padding: 5px 12px; margin-bottom: 24px;
        }
        .landing-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }
        .landing-eyebrow span { color: #34d399; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
        .landing-h1 { font-size: 52px; font-weight: 900; line-height: 1.1; margin: 0 0 20px; letter-spacing: -1px; }
        .landing-h1 em { color: #34d399; font-style: normal; }
        .landing-sub { font-size: 16px; color: rgba(255,255,255,0.55); line-height: 1.7; margin: 0 0 32px; max-width: 440px; }
        .landing-badges { display: flex; gap: 10px; margin-bottom: 36px; flex-wrap: wrap; }
        .landing-badge {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7);
        }
        .landing-cta-row { display: flex; gap: 12px; align-items: center; }
        .landing-cta-btn {
          background: #34d399; color: #030a14; border: none; border-radius: 10px;
          padding: 14px 32px; font-family: inherit; font-weight: 800; font-size: 15px; cursor: pointer;
        }
        .landing-cta-note { color: rgba(255,255,255,0.3); font-size: 12px; }

        /* ── Phone mockup ──────────────────────────────────── */
        .landing-phone-wrap {
          display: flex; justify-content: center; position: relative;
        }
        .landing-phone-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 360px; height: 580px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(52,211,153,0.11) 0%, transparent 70%);
          pointer-events: none;
        }
        .landing-phone-shell {
          width: 280px; border-radius: 46px; background: #161616;
          box-shadow: 0 0 0 2px #262626, 0 0 0 5px #0d0d0d, 0 36px 72px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.07);
          padding: 10px 8px; position: relative; flex-shrink: 0;
        }
        .landing-phone-btn-l1 { position:absolute;left:-2.5px;top:90px;  width:3px;height:30px;background:#2a2a2a;border-radius:2px 0 0 2px }
        .landing-phone-btn-l2 { position:absolute;left:-2.5px;top:130px; width:3px;height:55px;background:#2a2a2a;border-radius:2px 0 0 2px }
        .landing-phone-btn-l3 { position:absolute;left:-2.5px;top:196px; width:3px;height:55px;background:#2a2a2a;border-radius:2px 0 0 2px }
        .landing-phone-btn-r  { position:absolute;right:-2.5px;top:145px;width:3px;height:70px;background:#2a2a2a;border-radius:0 2px 2px 0 }
        .landing-phone-screen { border-radius: 38px; overflow: hidden; background: #030a14; position: relative; }
        .landing-phone-statusbar {
          height: 38px; background: #030a14; display: flex; align-items: center;
          justify-content: space-between; padding: 0 20px; position: relative; z-index: 2;
        }
        .landing-phone-statusbar span { font-size: 11px; font-weight: 700; color: white; }
        .landing-phone-island {
          position: absolute; left: 50%; transform: translateX(-50%);
          top: 7px; width: 86px; height: 26px; background: #000; border-radius: 15px;
        }
        .landing-phone-content { width: 264px; height: 570px; overflow: hidden; }
        .landing-phone-scaler { width: 390px; transform-origin: top left; pointer-events: none; }

        /* ── Stats bar ─────────────────────────────────────── */
        .landing-stats-bar {
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.015);
        }
        .landing-stats-inner {
          max-width: 1280px; margin: 0 auto; padding: 24px 48px; display: flex;
        }
        .landing-stat {
          flex: 1; text-align: center;
        }
        .landing-stat-num { font-size: 26px; font-weight: 900; color: #34d399; }
        .landing-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; font-weight: 500; }
        .landing-stat-divider { border-right: 1px solid rgba(255,255,255,0.06); }

        /* ── Features ──────────────────────────────────────── */
        .landing-features {
          max-width: 1280px; margin: 0 auto; padding: 60px 48px 48px;
        }
        .landing-features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .landing-feature-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 28px 24px;
        }
        .landing-feature-icon { font-size: 28px; margin-bottom: 12px; }
        .landing-feature-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .landing-feature-body { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.6; }

        /* ── Footer ────────────────────────────────────────── */
        .landing-footer { text-align: center; padding: 0 48px 48px; color: rgba(255,255,255,0.2); font-size: 11px; }

        /* ── Mobile ────────────────────────────────────────── */
        @media (max-width: 768px) {
          .landing-nav { padding: 14px 20px; }
          .landing-nav img { height: 28px; }

          .landing-hero {
            grid-template-columns: 1fr;
            gap: 0;
            padding: 32px 20px 28px;
          }
          .landing-phone-wrap { display: none; }

          .landing-eyebrow { margin-bottom: 16px; }
          .landing-h1 { font-size: 36px; letter-spacing: -0.5px; margin-bottom: 14px; }
          .landing-sub { font-size: 15px; margin-bottom: 24px; max-width: 100%; }
          .landing-badges { margin-bottom: 28px; }
          .landing-cta-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .landing-cta-btn { padding: 16px; font-size: 16px; text-align: center; }
          .landing-cta-note { text-align: center; }

          .landing-stats-inner { padding: 0; flex-wrap: wrap; }
          .landing-stat { padding: 20px 8px; width: 50%; box-sizing: border-box; }
          .landing-stat:nth-child(1), .landing-stat:nth-child(3) { border-right: 1px solid rgba(255,255,255,0.06); }
          .landing-stat:nth-child(1), .landing-stat:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.06); }
          .landing-stat-divider { border-right: none; }
          .landing-stat-num { font-size: 22px; }

          .landing-features { padding: 32px 20px 32px; }
          .landing-features-grid { grid-template-columns: 1fr; gap: 12px; }
          .landing-feature-card { padding: 20px 18px; }

          .landing-footer { padding: 0 20px 40px; }
          .landing-stats-bar { display: none; }
        }
      `}</style>

      {/* Nav */}
      <nav className="landing-nav">
        <img src={logoImage} alt="LiveSwell" />
        <button className="landing-nav-btn" onClick={handleLogin}>Sign In</button>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        {/* Left — copy */}
        <div>
          <div className="landing-eyebrow">
            <div className="landing-eyebrow-dot" />
            <span>LIVE OCEAN DATA · 218+ SPOTS</span>
          </div>
          <h1 className="landing-h1">
            Read the Ocean.<br />
            <em>Catch the</em><br />
            Moment.
          </h1>
          <p className="landing-sub">
            Real-time surf conditions from 1,355+ NOAA buoys worldwide. Wave heights, swell periods, tides, and wind — all in one place.
          </p>
          <div className="landing-badges">
            {["218+ Surf Spots", "6 Continents", "Real-time NOAA"].map(label => (
              <div key={label} className="landing-badge">{label}</div>
            ))}
          </div>
          <div className="landing-cta-row">
            <button className="landing-cta-btn" onClick={handleLogin}>Sign in with Replit →</button>
            <span className="landing-cta-note">Free · No credit card needed</span>
          </div>
        </div>

        {/* Right — phone (desktop only) */}
        <div className="landing-phone-wrap">
          <div className="landing-phone-glow" />
          <div className="landing-phone-shell">
            <div className="landing-phone-btn-l1" />
            <div className="landing-phone-btn-l2" />
            <div className="landing-phone-btn-l3" />
            <div className="landing-phone-btn-r"  />
            <div className="landing-phone-screen">
              <div className="landing-phone-statusbar">
                <span>9:41</span>
                <div className="landing-phone-island" />
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
              <div className="landing-phone-content">
                <div className="landing-phone-scaler" style={{ transform: `scale(${SCALE})` }}>
                  <PhoneScreen />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="landing-stats-bar">
        <div className="landing-stats-inner">
          {[
            { num: "218+",      label: "Surf Spots"    },
            { num: "1,355+",    label: "NOAA Stations" },
            { num: "6",         label: "Continents"    },
            { num: "Real-time", label: "Wave Data"     },
          ].map((s, i) => (
            <div key={s.num} className={`landing-stat${i < 3 ? " landing-stat-divider" : ""}`}>
              <div className="landing-stat-num">{s.num}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="landing-features">
        <div className="landing-features-grid">
          {[
            { icon: "🌊", title: "Global Wave Forecasts", body: "7-day wave height, period, and direction powered by NOAA NWS and Open-Meteo Marine — covering every beach on Earth." },
            { icon: "📍", title: "228+ Curated Spots",    body: "From Pipeline to Jeffreys Bay. Advanced, intermediate, and beginner breaks across 6 continents with real-time conditions." },
            { icon: "⭐", title: "Personal Favorites",    body: "Save your go-to breaks and get them at a glance. Your personalized surf dashboard, always one tap away." },
          ].map(f => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-body">{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-footer">
        Data sources: NOAA NDBC · OpenWeatherMap · Open-Meteo Marine · NOAA Tides &amp; Currents
      </div>
    </div>
  );
}
