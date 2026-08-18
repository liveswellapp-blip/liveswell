import type { ReactNode } from "react";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";
import screenConditions from "@assets/screenshot-conditions.png";
import screenExplore from "@assets/screenshot-explore.png";
import screenHistory from "@assets/screenshot-wave-history.png";
import screenAlerts from "@assets/screenshot-alerts.png";

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
  const handleLogin = () => { window.location.href = "/sign-in"; };
  const handleSignUp = () => { window.location.href = "/sign-up"; };

  const features = [
    { icon: "🌊", title: "Live NOAA Buoy Data", body: "Real wave height, period, and direction pulled directly from NOAA's network of offshore buoys — updated every 30 minutes." },
    { icon: "📅", title: "5-Day Swell Forecast", body: "See what's coming. Daily wave and wind forecasts for your break so you can plan your sessions days in advance." },
    { icon: "📱", title: "SMS Condition Alerts", body: "Set your own thresholds. When the swell hits your criteria, you get a text — before you even think to check the app." },
    { icon: "📍", title: "230+ Breaks Worldwide", body: "From Pipeline to Portugal. Search any coastal spot and get the same depth of data as your home break." },
    { icon: "✨", title: "AI Surf Summary", body: "A plain-English read of current conditions written by AI — wind, swell, tide, all translated into whether it's worth paddling out." },
    { icon: "🌙", title: "Tide Charts & Sunrise", body: "Full tide curve for the day with high/low times, plus sunrise and sunset so you can time your dawn patrol perfectly." },
  ];

  const screenshots = [
    { label: "Live Conditions",  caption: "Full detail — swell height, wind, real NOAA tide chart, and sunrise/sunset for your break.",   img: screenConditions },
    { label: "Discover Spots",   caption: "Browse 230+ breaks worldwide with live wave heights, periods, and conditions ratings.", img: screenExplore    },
    { label: "Wave History",     caption: "24-hour buoy history — every reading plotted so you can see the swell trend.",           img: screenHistory    },
    { label: "SMS Alerts",       caption: "Set swell, wind, or tide thresholds and get a text the moment conditions hit your criteria.", img: screenAlerts },
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
          position: sticky; top: 0; z-index: 50;
          background: rgba(3,10,20,0.92); backdrop-filter: blur(12px);
        }
        .landing-nav img { height: 36px; object-fit: contain; }
        .landing-nav-btn {
          background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 8px 20px;
          font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .landing-nav-btn:hover { border-color: rgba(255,255,255,0.25); color: white; }

        /* ── Hero ───────────────────────────────────────────── */
        .landing-hero {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; padding: 72px 48px 64px;
          align-items: center; max-width: 1280px; margin: 0 auto;
        }
        .landing-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25);
          border-radius: 20px; padding: 5px 12px; margin-bottom: 24px;
        }
        .landing-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }
        .landing-eyebrow span { color: #34d399; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
        .landing-h1 { font-size: 54px; font-weight: 900; line-height: 1.08; margin: 0 0 20px; letter-spacing: -1.5px; }
        .landing-h1 em { color: #34d399; font-style: normal; }
        .landing-sub { font-size: 16px; color: rgba(255,255,255,0.55); line-height: 1.75; margin: 0 0 28px; max-width: 460px; }
        .landing-badges { display: flex; gap: 8px; margin-bottom: 36px; flex-wrap: wrap; }
        .landing-badge {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 5px 11px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6);
        }
        .landing-cta-row { display: flex; gap: 12px; align-items: center; }
        .landing-cta-btn {
          background: #34d399; color: #030a14; border: none; border-radius: 10px;
          padding: 15px 36px; font-family: inherit; font-weight: 800; font-size: 15px; cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .landing-cta-btn:hover { background: #2fd494; transform: translateY(-1px); }
        .landing-cta-note { color: rgba(255,255,255,0.3); font-size: 12px; }

        /* ── Hero phone ─────────────────────────────────────── */
        .landing-phone-wrap { display: flex; justify-content: center; position: relative; }
        .landing-phone-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 400px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(52,211,153,0.13) 0%, transparent 68%);
          pointer-events: none;
        }

        /* ── Stats bar ──────────────────────────────────────── */
        .landing-stats-bar {
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.015);
        }
        .landing-stats-inner { max-width: 1280px; margin: 0 auto; padding: 28px 48px; display: flex; }
        .landing-stat { flex: 1; text-align: center; }
        .landing-stat-num { font-size: 28px; font-weight: 900; color: #34d399; }
        .landing-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; font-weight: 500; }
        .landing-stat-divider { border-right: 1px solid rgba(255,255,255,0.06); }

        /* ── Data partners ──────────────────────────────────── */
        .landing-partners {
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 28px 48px;
          background: rgba(255,255,255,0.015);
        }
        .landing-partners-inner {
          max-width: 1280px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center; gap: 18px;
        }
        .landing-partners-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.25); text-transform: uppercase;
        }
        .landing-partners-row {
          display: flex; align-items: center; justify-content: center;
          gap: 52px; flex-wrap: wrap;
        }
        .landing-partner {
          display: flex; align-items: center; gap: 10px;
          opacity: 0.45; transition: opacity 0.2s;
        }
        .landing-partner:hover { opacity: 0.7; }
        .landing-partner img { height: 44px; width: auto; object-fit: contain; }
        .landing-partner svg { height: 44px; width: auto; }
        /* transparent-bg logos → force solid white */
        .lp-invert { filter: brightness(0) invert(1); }
        /* white-bg black logos → invert makes bg black, logo white;
           screen blend dissolves the black on our dark page background */
        .lp-screen { filter: invert(1); mix-blend-mode: screen; }

        /* ── Features ───────────────────────────────────────── */
        .landing-features { max-width: 1280px; margin: 0 auto; padding: 72px 48px 56px; }
        .landing-features-heading { font-size: 34px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 10px; text-align: center; }
        .landing-features-sub { font-size: 15px; color: rgba(255,255,255,0.45); text-align: center; margin-bottom: 48px; line-height: 1.6; }
        .landing-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .landing-feature-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 28px 24px;
          transition: border-color 0.2s;
        }
        .landing-feature-card:hover { border-color: rgba(52,211,153,0.2); }
        .landing-feature-icon { font-size: 28px; margin-bottom: 14px; }
        .landing-feature-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .landing-feature-body { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.65; }

        /* ── How it works ───────────────────────────────────── */
        .landing-hiw {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 72px 48px;
        }
        .landing-hiw-inner { max-width: 1280px; margin: 0 auto; }
        .landing-hiw-heading { font-size: 34px; font-weight: 900; letter-spacing: -0.5px; text-align: center; margin-bottom: 10px; }
        .landing-hiw-sub { font-size: 15px; color: rgba(255,255,255,0.45); text-align: center; margin-bottom: 52px; line-height: 1.6; }
        .landing-hiw-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; position: relative; }
        .landing-hiw-connector {
          position: absolute; top: 28px; left: calc(33.33% + 16px); right: calc(33.33% + 16px);
          height: 1px; background: linear-gradient(90deg, rgba(52,211,153,0.3), rgba(52,211,153,0.1));
          pointer-events: none;
        }
        .landing-hiw-step { text-align: center; padding: 0 8px; }
        .landing-hiw-num {
          width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 20px;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: #34d399;
        }
        .landing-hiw-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
        .landing-hiw-body { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.65; }

        /* ── SMS banner ─────────────────────────────────────── */
        .landing-sms-banner {
          margin: 0 48px 0;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(52,211,153,0.09) 0%, rgba(6,182,212,0.07) 100%);
          border: 1px solid rgba(52,211,153,0.18);
          padding: 52px 64px;
          display: grid; grid-template-columns: 1fr auto;
          gap: 48px; align-items: center;
          max-width: 1184px; margin: 0 auto 0; position: relative;
        }
        .landing-sms-banner-wrap { padding: 0 48px 72px; max-width: 1280px; margin: 0 auto; }
        .landing-sms-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2);
          border-radius: 20px; padding: 4px 12px; margin-bottom: 16px;
        }
        .landing-sms-eyebrow span { color: #34d399; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
        .landing-sms-heading { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 14px; }
        .landing-sms-body { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.7; max-width: 500px; }
        .landing-sms-example {
          background: rgba(3,10,20,0.6); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px; padding: 20px 24px; min-width: 280px; flex-shrink: 0;
        }
        .landing-sms-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; margin-bottom: 12px; text-transform: uppercase; }
        .landing-sms-msg {
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2);
          border-radius: 12px 12px 4px 12px; padding: 12px 14px;
          font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.6;
          margin-bottom: 6px;
        }
        .landing-sms-time { font-size: 10px; color: rgba(255,255,255,0.25); text-align: right; }

        /* ── Screenshots ────────────────────────────────────── */
        .landing-screenshots {
          padding: 72px 48px 80px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .landing-screenshots-heading {
          text-align: center; margin-bottom: 12px;
          font-size: 34px; font-weight: 900; letter-spacing: -0.5px;
        }
        .landing-screenshots-sub {
          text-align: center; color: rgba(255,255,255,0.45); font-size: 15px;
          margin-bottom: 56px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.6;
        }
        .landing-screenshots-grid {
          display: grid; grid-template-columns: repeat(3, 280px);
          gap: 48px; justify-content: center;
        }
        .landing-screenshot-item { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .landing-screenshot-label { font-size: 14px; font-weight: 800; color: white; letter-spacing: -0.2px; }
        .landing-screenshot-caption {
          font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6;
          text-align: center; max-width: 240px;
        }

        /* ── Footer ─────────────────────────────────────────── */
        .landing-footer-wrap {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 48px 48px 40px;
        }
        .landing-footer-grid {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.4fr 1fr 1fr;
          gap: 48px; margin-bottom: 40px;
        }
        .landing-footer-logo { height: 28px; object-fit: contain; margin-bottom: 12px; display: block; }
        .landing-footer-tagline { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6; max-width: 220px; }
        .landing-footer-col-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
        .landing-footer-link {
          display: block; font-size: 13px; color: rgba(255,255,255,0.4);
          text-decoration: none; margin-bottom: 8px;
          transition: color 0.15s;
        }
        .landing-footer-link:hover { color: rgba(255,255,255,0.7); }
        .landing-footer-bottom {
          max-width: 1280px; margin: 0 auto;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 24px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 11px; color: rgba(255,255,255,0.2);
        }

        /* ── Mobile ─────────────────────────────────────────── */
        @media (max-width: 768px) {
          .landing-nav { padding: 14px 20px; }
          .landing-nav img { height: 28px; }

          .landing-hero { grid-template-columns: 1fr; gap: 40px; padding: 36px 20px 32px; }
          .landing-phone-wrap { justify-content: center; }
          .landing-eyebrow { margin-bottom: 16px; }
          .landing-h1 { font-size: 38px; letter-spacing: -1px; margin-bottom: 16px; }
          .landing-sub { font-size: 15px; margin-bottom: 22px; max-width: 100%; }
          .landing-badges { margin-bottom: 28px; }
          .landing-cta-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .landing-cta-btn { padding: 16px; font-size: 16px; text-align: center; }
          .landing-cta-note { text-align: center; }

          .landing-stats-inner { padding: 20px 24px; flex-wrap: wrap; }
          .landing-stat { min-width: 50%; padding: 10px 0; }
          .landing-stat-divider { border-right: none; }

          .landing-partners { padding: 24px 20px; }
          .landing-partners-row { gap: 28px; }
          .landing-partner img, .landing-partner svg { height: 22px; }

          .landing-features { padding: 40px 20px; }
          .landing-features-grid { grid-template-columns: 1fr; gap: 12px; }
          .landing-feature-card { padding: 22px 20px; }

          .landing-hiw { padding: 40px 20px; }
          .landing-hiw-grid { grid-template-columns: 1fr; gap: 28px; }
          .landing-hiw-connector { display: none; }

          .landing-sms-banner-wrap { padding: 0 20px 48px; }
          .landing-sms-banner { grid-template-columns: 1fr; gap: 28px; padding: 32px 24px; }
          .landing-sms-heading { font-size: 24px; }
          .landing-sms-example { min-width: unset; }

          .landing-screenshots { padding: 40px 0 56px; border-top: none; }
          .landing-screenshots-heading { font-size: 26px; padding: 0 20px; }
          .landing-screenshots-sub { font-size: 14px; padding: 0 24px; margin-bottom: 36px; }
          .landing-screenshots-grid {
            grid-template-columns: 1fr; gap: 40px;
            padding: 0 20px 16px; justify-content: center;
          }
          .landing-screenshot-item { align-items: center; }

          .landing-footer-wrap { padding: 36px 20px 28px; }
          .landing-footer-grid { grid-template-columns: 1fr; gap: 32px; margin-bottom: 28px; }
          .landing-footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
        }
      `}</style>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <img src={logoImage} alt="LiveSwell" />
        <button className="landing-nav-btn" onClick={handleLogin}>Sign In</button>
      </nav>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="landing-hero">
        <div>

          <h1 className="landing-h1">
            Read the Ocean.<br />
            <em>Catch the</em><br />
            Moment.
          </h1>
          <p className="landing-sub">Real-time surf conditions powered by NOAA buoy data, open marine forecasts, and AI. Built for surfers who want facts, not opinions.</p>

          <div className="landing-cta-row">
            <button className="landing-cta-btn" onClick={handleSignUp}>Get Started Free</button>
          </div>
        </div>

        <div className="landing-phone-wrap">
          <div className="landing-phone-glow" />
          <PhoneShell statusBar={false}>
            <img src={screenConditions} alt="LiveSwell conditions screen" style={{ width: 390, display: "block" }} />
          </PhoneShell>
        </div>
      </div>
      {/* ── Data partners ───────────────────────────────────────── */}
      <div className="landing-partners">
        <div className="landing-partners-inner">
          <div className="landing-partners-row">

            <div className="landing-partner">
              <img src="/partners-noaa.png?v=3" alt="NOAA" />
            </div>

            <div className="landing-partner">
              <img src="/partners-openweather.png?v=3" alt="OpenWeatherMap" />
            </div>

            <div className="landing-partner">
              <img src="/partners-openmeteo.png?v=3" alt="Open-Meteo" />
            </div>

            <div className="landing-partner">
              <img src="/partners-windy.png?v=3" alt="Windy" />
            </div>

          </div>
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <div className="landing-stats-bar">
        <div className="landing-stats-inner">
          {[
            { num: "230+",      label: "Surf Spots"    },
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
      {/* ── Features ────────────────────────────────────────────── */}
      <div className="landing-features">
        <div className="landing-features-heading">No More Opinions. Just Raw Data.</div>
        <p className="landing-features-sub">Real data, no guesswork. Built for surfers who need to know.</p>
        <div className="landing-features-grid">
          {features.map(f => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-body">{f.body}</div>
            </div>
          ))}
        </div>
      </div>
      {/* ── How it works ────────────────────────────────────────── */}
      <div className="landing-hiw">
        <div className="landing-hiw-inner">
          <div className="landing-hiw-heading">Up and running in 60 seconds</div>
          <p className="landing-hiw-sub">Sign in free and start checking conditions in seconds. <a href="/pricing" style={{ color: "#34d399", textDecoration: "underline" }}>See Pro plans →</a></p>
          <div className="landing-hiw-grid">
            <div className="landing-hiw-connector" />
            {[
              { n: "1", title: "Search your break", body: "Type any beach, point break, or reef. LiveSwell covers 230+ spots across every surfing continent." },
              { n: "2", title: "Get live conditions", body: "Instantly see real buoy readings, wind speed and direction, tide times, and today's AI surf summary." },
              { n: "3", title: "Set your alerts", body: "Tell us your conditions — wave height, wind speed — and we'll text you the moment they're met." },
            ].map(step => (
              <div key={step.n} className="landing-hiw-step">
                <div className="landing-hiw-num">{step.n}</div>
                <div className="landing-hiw-title">{step.title}</div>
                <div className="landing-hiw-body">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ── SMS alert banner ────────────────────────────────────── */}
      <div className="landing-sms-banner-wrap">
        <div className="landing-sms-banner">
          <div>
            <div className="landing-sms-heading">Never miss a swell again</div>
            <p className="landing-sms-body">
              Stop checking the app every morning hoping conditions lined up. Set your thresholds once —
              wave height, wind speed, swell direction — and LiveSwell texts you when your break is firing.
              Your phone buzzes, you grab your board.
            </p>
          </div>
          <div className="landing-sms-example">
            <div className="landing-sms-label">📩 Text message · 6:14 AM</div>
            <div className="landing-sms-msg">
              🌊 <strong>Trestles is firing.</strong><br />
              4.8 ft @ 14s SW swell · NNE offshore 8 mph · Low tide 6:42 AM<br /><br />
              Conditions match your alert. Get out there.
            </div>
            <div className="landing-sms-time">LiveSwell · Reply STOP to opt out</div>
          </div>
        </div>
      </div>
      {/* ── Screenshots ─────────────────────────────────────────── */}
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
      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="landing-footer-wrap">
        <div className="landing-footer-grid">
          <div>
            <img src={logoImage} alt="LiveSwell" className="landing-footer-logo" />
            <div className="landing-footer-tagline">
              Real-time surf conditions powered by NOAA buoy data, open marine forecasts, and AI.
              Built for surfers who want facts, not opinions.
            </div>
          </div>
          <div>
            <div className="landing-footer-col-title">App</div>
            <a href="/sign-in" className="landing-footer-link" onClick={e => { e.preventDefault(); handleLogin(); }}>Sign In</a>
            <a href="/pricing" className="landing-footer-link">Pricing</a>
            <a href="/support" className="landing-footer-link">Support</a>
            <a href="/terms" className="landing-footer-link">Terms of Service</a>
            <a href="/privacy" className="landing-footer-link">Privacy Policy</a>
          </div>
          <div>
            <div className="landing-footer-col-title">Data Sources</div>
            <span className="landing-footer-link" style={{ cursor: "default" }}>NOAA NDBC Buoys</span>
            <span className="landing-footer-link" style={{ cursor: "default" }}>NOAA Tides &amp; Currents</span>
            <span className="landing-footer-link" style={{ cursor: "default" }}>OpenWeatherMap</span>
            <span className="landing-footer-link" style={{ cursor: "default" }}>Open-Meteo Marine</span>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} LiveSwell. All rights reserved.</span>
          <span>Free to start · <a href="/pricing" style={{ color: "rgba(52,211,153,0.6)", textDecoration: "underline" }}>Pro plans from $4.99/mo</a></span>
        </div>
      </div>
    </div>
  );
}
