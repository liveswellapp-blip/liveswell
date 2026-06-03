import type { ReactNode } from "react";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";
import screenConditions from "@assets/image_1780504204791.png";
import screenSpots from "@assets/image_1780504263938.png";
import screenHistory from "@assets/image_1780504292264.png";
import screenForecast from "@assets/image_1780504331560.png";

const SCALE = 264 / 390;

/* ─── Shared tab bar ───────────────────────────────────────────── */
function TabBar({ active }: { active: "explore" | "conditions" | "favorites" | "profile" }) {
  const tabs = [
    { key: "explore",    icon: "🔍", label: "Explore"    },
    { key: "conditions", icon: "🌊", label: "Conditions" },
    { key: "favorites",  icon: "⭐", label: "Favorites"  },
    { key: "profile",    icon: "👤", label: "Profile"    },
  ] as const;
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", padding: "10px 18px 20px", background: "#030a14" }}>
      {tabs.map(t => (
        <div key={t.key} style={{ flex: 1, textAlign: "center" as const }}>
          <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
          <div style={{ fontSize: 9, color: t.key === active ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: t.key === active ? 700 : 400 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── App header ───────────────────────────────────────────────── */
function AppHeader() {
  return (
    <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <img src={logoImage} alt="LiveSwell" style={{ height: 22, objectFit: "contain" }} />
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#030a14" }}>JD</div>
    </div>
  );
}

/* ─── Screen 1: Explore ────────────────────────────────────────── */
function ExploreScreen() {
  const spots = [
    { name: "Pipeline",         loc: "Oahu, Hawaii",      ft: "8.2", period: "16s", wind: "NE offshore", badge: "Epic",       badgeColor: "#34d399", badgeBg: "rgba(52,211,153,0.12)",  badgeBorder: "rgba(52,211,153,0.3)"  },
    { name: "Trestles",         loc: "San Clemente, CA",  ft: "4.8", period: "14s", wind: "NNE offshore", badge: "Good",       badgeColor: "#34d399", badgeBg: "rgba(52,211,153,0.10)",  badgeBorder: "rgba(52,211,153,0.25)" },
    { name: "Rincon",           loc: "Santa Barbara, CA", ft: "3.6", period: "12s", wind: "W onshore",    badge: "Fair",       badgeColor: "#fbbf24", badgeBg: "rgba(251,191,36,0.10)",  badgeBorder: "rgba(251,191,36,0.25)" },
    { name: "Mavericks",        loc: "Half Moon Bay, CA", ft: "12.5", period: "18s", wind: "NW",          badge: "Experts",    badgeColor: "#f87171", badgeBg: "rgba(248,113,113,0.10)", badgeBorder: "rgba(248,113,113,0.25)"},
    { name: "Huntington Beach", loc: "Orange County, CA", ft: "2.1", period: "9s",  wind: "SW onshore",   badge: "Poor",       badgeColor: "rgba(255,255,255,0.35)", badgeBg: "rgba(255,255,255,0.03)", badgeBorder: "rgba(255,255,255,0.1)" },
  ];
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, color: "white", display: "flex", flexDirection: "column" }}>
      <AppHeader />
      <div style={{ padding: "10px 18px 6px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Search surf spots...</span>
        </div>
      </div>
      <div style={{ padding: "10px 18px 6px", display: "flex", gap: 8 }}>
        {["All", "Hawaii", "California", "Australia"].map((f, i) => (
          <div key={f} style={{ background: i === 0 ? "#34d399" : "rgba(255,255,255,0.05)", color: i === 0 ? "#030a14" : "rgba(255,255,255,0.5)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, border: i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
            {f}
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 18px 0" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" as const }}>🌊 Top Spots Near You</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {spots.map(s => (
            <div key={s.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" as const }}>{s.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.badgeColor, background: s.badgeBg, border: `1px solid ${s.badgeBorder}`, borderRadius: 6, padding: "1px 6px", flexShrink: 0 }}>{s.badge}</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>📍 {s.loc}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>💨 {s.wind} · {s.period} period</div>
              </div>
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>{s.ft}</span>
                  <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>ft</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 8 }} />
      <TabBar active="explore" />
    </div>
  );
}

/* ─── Screen 2: Conditions ─────────────────────────────────────── */
function ConditionsScreen() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, color: "white", display: "flex", flexDirection: "column" }}>
      <AppHeader />
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
      <div style={{ padding: "0 18px 8px" }}>
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
      <TabBar active="conditions" />
    </div>
  );
}

/* ─── Screen 3: Favorites ──────────────────────────────────────── */
function FavoritesScreen() {
  const favs = [
    { name: "Trestles",    loc: "San Clemente, CA",  ft: "4.8", wind: "NNE offshore 🤙", badge: "Good",  badgeColor: "#34d399", badgeBg: "rgba(52,211,153,0.1)",  badgeBorder: "rgba(52,211,153,0.25)",  tide: "Low ↑" },
    { name: "Pipeline",    loc: "Oahu, Hawaii",       ft: "8.2", wind: "NE offshore",     badge: "Epic",  badgeColor: "#34d399", badgeBg: "rgba(52,211,153,0.12)", badgeBorder: "rgba(52,211,153,0.3)",   tide: "Mid ↑" },
    { name: "Rincon",      loc: "Santa Barbara, CA",  ft: "3.6", wind: "W onshore",       badge: "Fair",  badgeColor: "#fbbf24", badgeBg: "rgba(251,191,36,0.1)",  badgeBorder: "rgba(251,191,36,0.25)",  tide: "High ↓" },
    { name: "Steamer Lane", loc: "Santa Cruz, CA",   ft: "5.1", wind: "NW offshore 🤙",  badge: "Good",  badgeColor: "#34d399", badgeBg: "rgba(52,211,153,0.1)",  badgeBorder: "rgba(52,211,153,0.25)",  tide: "Low ↑" },
  ];
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", width: 390, color: "white", display: "flex", flexDirection: "column" }}>
      <AppHeader />
      <div style={{ padding: "14px 18px 10px" }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.3px", marginBottom: 2 }}>My Favorites</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Your saved breaks · updated live</div>
      </div>
      <div style={{ padding: "4px 18px 0", display: "flex", flexDirection: "column" as const, gap: 9 }}>
        {favs.map(s => (
          <div key={s.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.badgeColor, background: s.badgeBg, border: `1px solid ${s.badgeBorder}`, borderRadius: 6, padding: "1px 6px" }}>{s.badge}</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>📍 {s.loc}</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>{s.ft}</span>
                  <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>ft</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "5px 8px" }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>💨 WIND</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{s.wind}</div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "5px 8px" }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>🌙 TIDE</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{s.tide}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 12 }} />
      <TabBar active="favorites" />
    </div>
  );
}

/* ─── Shared phone shell ───────────────────────────────────────── */
function PhoneShell({ children, statusBar = true }: { children: ReactNode; statusBar?: boolean }) {
  return (
    <div style={{ width: 280, borderRadius: 46, background: "#161616", boxShadow: "0 0 0 2px #262626, 0 0 0 5px #0d0d0d, 0 36px 72px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.07)", padding: "10px 8px", position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", left: -2.5, top: 90,  width: 3, height: 30, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -2.5, top: 130, width: 3, height: 55, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -2.5, top: 196, width: 3, height: 55, background: "#2a2a2a", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", right: -2.5, top: 145, width: 3, height: 70, background: "#2a2a2a", borderRadius: "0 2px 2px 0" }} />
      <div style={{ borderRadius: 38, overflow: "hidden", background: "#030a14", position: "relative" }}>
        {statusBar && (
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
        )}
        <div style={{ width: 264, height: 570, overflow: "hidden" }}>
          <div style={{ width: 390, transformOrigin: "top left", transform: `scale(${SCALE})`, pointerEvents: "none" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Landing page ─────────────────────────────────────────────── */
export default function Landing() {
  const handleLogin = () => { window.location.href = "/api/login"; };

  const screenshots = [
    { label: "Live Conditions",  caption: "Full detail view — waves, wind, tides, and real-time NOAA buoy readings.",   img: screenConditions },
    { label: "Discover Spots",   caption: "Browse 228+ breaks worldwide with live wave heights and conditions ratings.", img: screenSpots      },
    { label: "Wave History",     caption: "24-hour buoy history — every reading plotted so you can see the swell trend.", img: screenHistory    },
    { label: "5-Day Forecast",   caption: "Wave and tide forecast plus nearby spots, all on one scrollable screen.",     img: screenForecast   },
  ];

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

        /* ── Nav ────────────────────────────────────────────── */
        .landing-nav {
          padding: 16px 48px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .landing-nav img { height: 36px; object-fit: contain; }
        .landing-nav-btn {
          background: #34d399; color: #030a14; border: none;
          border-radius: 8px; padding: 8px 20px;
          font-family: inherit; font-weight: 700; font-size: 13px; cursor: pointer;
        }

        /* ── Hero ───────────────────────────────────────────── */
        .landing-hero {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; padding: 64px 48px 56px;
          align-items: center; max-width: 1280px; margin: 0 auto;
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

        /* ── Hero phone ─────────────────────────────────────── */
        .landing-phone-wrap { display: flex; justify-content: center; position: relative; }
        .landing-phone-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 360px; height: 580px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(52,211,153,0.11) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Stats bar ──────────────────────────────────────── */
        .landing-stats-bar {
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.015);
        }
        .landing-stats-inner { max-width: 1280px; margin: 0 auto; padding: 24px 48px; display: flex; }
        .landing-stat { flex: 1; text-align: center; }
        .landing-stat-num { font-size: 26px; font-weight: 900; color: #34d399; }
        .landing-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; font-weight: 500; }
        .landing-stat-divider { border-right: 1px solid rgba(255,255,255,0.06); }

        /* ── Features ───────────────────────────────────────── */
        .landing-features { max-width: 1280px; margin: 0 auto; padding: 60px 48px 48px; }
        .landing-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .landing-feature-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 28px 24px;
        }
        .landing-feature-icon { font-size: 28px; margin-bottom: 12px; }
        .landing-feature-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .landing-feature-body { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.6; }

        /* ── Screenshots ────────────────────────────────────── */
        .landing-screenshots {
          padding: 64px 48px 72px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .landing-screenshots-heading {
          text-align: center; margin-bottom: 12px;
          font-size: 34px; font-weight: 900; letter-spacing: -0.5px;
        }
        .landing-screenshots-sub {
          text-align: center; color: rgba(255,255,255,0.45); font-size: 15px;
          margin-bottom: 52px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.6;
        }
        .landing-screenshots-grid {
          display: grid; grid-template-columns: repeat(3, 280px);
          gap: 48px; justify-content: center;
        }
        .landing-screenshot-item { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .landing-screenshot-label {
          font-size: 14px; font-weight: 800; color: white; letter-spacing: -0.2px;
        }
        .landing-screenshot-caption {
          font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6;
          text-align: center; max-width: 240px;
        }

        /* ── Footer ─────────────────────────────────────────── */
        .landing-footer { text-align: center; padding: 0 48px 48px; color: rgba(255,255,255,0.2); font-size: 11px; }

        /* ── Mobile ─────────────────────────────────────────── */
        @media (max-width: 768px) {
          .landing-nav { padding: 14px 20px; }
          .landing-nav img { height: 28px; }

          .landing-hero { grid-template-columns: 1fr; gap: 0; padding: 32px 20px 28px; }
          .landing-phone-wrap { display: none; }
          .landing-eyebrow { margin-bottom: 16px; }
          .landing-h1 { font-size: 36px; letter-spacing: -0.5px; margin-bottom: 14px; }
          .landing-sub { font-size: 15px; margin-bottom: 24px; max-width: 100%; }
          .landing-badges { margin-bottom: 28px; }
          .landing-cta-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .landing-cta-btn { padding: 16px; font-size: 16px; text-align: center; }
          .landing-cta-note { text-align: center; }

          .landing-stats-bar { display: none; }

          .landing-features { padding: 32px 20px 32px; }
          .landing-features-grid { grid-template-columns: 1fr; gap: 12px; }
          .landing-feature-card { padding: 20px 18px; }

          .landing-screenshots { padding: 40px 0 48px; border-top: none; }
          .landing-screenshots-heading { font-size: 26px; padding: 0 20px; }
          .landing-screenshots-sub { font-size: 14px; padding: 0 24px; margin-bottom: 32px; }
          .landing-screenshots-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 0 20px 16px;
            justify-content: center;
          }
          .landing-screenshot-item { align-items: center; }

          .landing-footer { padding: 0 20px 40px; }
        }
      `}</style>
      {/* Nav */}
      <nav className="landing-nav">
        <img src={logoImage} alt="LiveSwell" />
        <button className="landing-nav-btn" onClick={handleLogin}>Sign In</button>
      </nav>
      {/* Hero */}
      <div className="landing-hero">
        <div>
          <h1 className="landing-h1">
            Read the Ocean.<br />
            <em>Catch the</em><br />
            Moment.
          </h1>
          <p className="landing-sub">Get accurate and real-time NOAA wave, wind and tide data across 200+ surf locations.</p>
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

        <div className="landing-phone-wrap">
          <div className="landing-phone-glow" />
          <PhoneShell statusBar={false}>
            <img src={screenConditions} alt="LiveSwell conditions screen" style={{ width: 390, display: "block" }} />
          </PhoneShell>
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
      {/* Screenshots */}
      <div className="landing-screenshots">
        <div className="landing-screenshots-heading">See it in action</div>
        <p className="landing-screenshots-sub">
          Every screen built around one goal — getting you the right information before you paddle out.
        </p>
        <div className="landing-screenshots-grid">
          {screenshots.map(s => (
            <div key={s.label} className="landing-screenshot-item">
              <PhoneShell statusBar={false}>
                <img src={s.img} alt={s.label} style={{ width: 390, display: "block" }} />
              </PhoneShell>
              <div className="landing-screenshot-label">{s.label}</div>
              <div className="landing-screenshot-caption">{s.caption}</div>
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
