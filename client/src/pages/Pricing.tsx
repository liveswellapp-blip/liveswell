import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

// ─── Plan IDs ──────────────────────────────────────────────────────────────
// These are injected via environment variables exposed to the client build.
// If not set, the checkout button will show a configuration error.
const MONTHLY_PLAN_ID = import.meta.env.VITE_WHOP_MONTHLY_PLAN_ID ?? "";
const ANNUAL_PLAN_ID  = import.meta.env.VITE_WHOP_ANNUAL_PLAN_ID  ?? "";

// ─── Feature lists ─────────────────────────────────────────────────────────
const FREE_FEATURES = [
  { icon: "🌊", text: "Real-time surf conditions (NOAA buoy data)" },
  { icon: "📅", text: "5-day swell & wind forecast" },
  { icon: "🌙", text: "Tide charts & sunrise/sunset times" },
  { icon: "📍", text: "230+ surf spots worldwide" },
];

const PRO_FEATURES = [
  { icon: "🌊", text: "Everything in Free" },
  { icon: "📱", text: "SMS condition alerts" },
  { icon: "🔔", text: "Push notification alerts" },
  { icon: "✉️",  text: "Email condition alerts" },
  { icon: "✨", text: "AI surf chat & daily summaries" },
];

// ─── Subscription query ─────────────────────────────────────────────────────
interface SubStatus {
  isPro: boolean;
  plan: "monthly" | "annual" | null;
  renewsAt: number | null;
}

export default function PricingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const qc = useQueryClient();

  const params = new URLSearchParams(search);
  const success = params.get("success") === "true";

  // ── subscription status (logged-in users only) ──────────────────────────
  // Poll on ?success=true until isPro becomes true (webhook can lag checkout redirect).
  const pollOnSuccess = success && isAuthenticated;
  const { data: subStatus, isLoading: subLoading } = useQuery<SubStatus>({
    queryKey: ["/api/whop/subscription"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    // While waiting for webhook confirmation, poll every 3 s up to ~30 s.
    refetchInterval: (query) => {
      if (!pollOnSuccess) return false;
      if (query.state.data?.isPro) return false;   // confirmed — stop polling
      const age = Date.now() - (query.state.dataUpdatedAt ?? 0);
      return age < 30_000 ? 3_000 : false;          // give up after 30 s
    },
  });

  // ── checkout mutation ───────────────────────────────────────────────────
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/whop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ purchaseUrl: string }>;
    },
    onSuccess: ({ purchaseUrl }) => {
      window.location.href = purchaseUrl;
    },
    onError: (err: Error) => {
      setCheckoutError(err.message);
    },
  });

  function handleSubscribe(planId: string) {
    setCheckoutError(null);
    if (!isAuthenticated) {
      const target = encodeURIComponent("/pricing");
      navigate(`/sign-in?redirect_url=${target}`);
      return;
    }
    checkout.mutate(planId);
  }

  // True while we don't yet know the user's subscription status.
  // Checkout must be blocked until this resolves to prevent duplicate sessions.
  const statusUnknown = authLoading || (isAuthenticated && subLoading);
  const isProUser = subStatus?.isPro ?? false;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        .pricing-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 40px 36px;
          flex: 1;
          max-width: 440px;
          transition: border-color 0.2s;
        }
        .pricing-card-pro {
          background: linear-gradient(160deg, rgba(52,211,153,0.06) 0%, rgba(6,182,212,0.04) 100%);
          border-color: rgba(52,211,153,0.3);
          position: relative;
        }
        .pricing-card:hover { border-color: rgba(255,255,255,0.15); }
        .pricing-card-pro:hover { border-color: rgba(52,211,153,0.5); }
        .pricing-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.3);
          border-radius: 20px; padding: 3px 12px;
          font-size: 11px; font-weight: 700; color: #34d399; letter-spacing: 0.05em;
          margin-bottom: 20px;
        }
        .pricing-tier-label { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .pricing-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
        .pricing-price-amount { font-size: 52px; font-weight: 900; line-height: 1; }
        .pricing-price-period { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 500; }
        .pricing-price-free { font-size: 52px; font-weight: 900; line-height: 1; color: rgba(255,255,255,0.5); }
        .pricing-desc { font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 28px; line-height: 1.6; }
        .pricing-btn {
          width: 100%; padding: 15px; border-radius: 12px; font-family: inherit;
          font-weight: 800; font-size: 15px; cursor: pointer; border: none;
          transition: background 0.2s, opacity 0.2s, transform 0.1s;
        }
        .pricing-btn-free {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
        }
        .pricing-btn-free:hover { background: rgba(255,255,255,0.1); color: white; }
        .pricing-btn-pro { background: #34d399; color: #030a14; }
        .pricing-btn-pro:hover:not(:disabled) { background: #2fd494; transform: translateY(-1px); }
        .pricing-btn-pro:disabled { opacity: 0.6; cursor: not-allowed; }
        .pricing-btn-current { background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.3); color: #34d399; cursor: default; }
        .pricing-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 24px 0; }
        .pricing-feature { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .pricing-feature-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .pricing-feature-text { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; }
        .pricing-annual-note {
          text-align: center; margin-top: 12px;
          font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6;
        }
        .pricing-annual-note strong { color: #34d399; }
        .pricing-manage-link {
          display: block; text-align: center; margin-top: 16px;
          font-size: 12px; color: rgba(52,211,153,0.7); text-decoration: underline;
          cursor: pointer;
        }
        .pricing-manage-link:hover { color: #34d399; }
        .success-banner {
          background: linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(6,182,212,0.08) 100%);
          border: 1px solid rgba(52,211,153,0.3);
          border-radius: 18px; padding: 28px 36px; text-align: center;
          max-width: 600px; margin: 0 auto 48px;
        }
        .success-icon { font-size: 48px; margin-bottom: 16px; }
        .success-title { font-size: 24px; font-weight: 900; margin-bottom: 10px; color: #34d399; }
        .success-body { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 20px; }
        .success-btn {
          display: inline-block; background: #34d399; color: #030a14;
          border-radius: 10px; padding: 12px 28px;
          font-family: inherit; font-weight: 800; font-size: 14px;
          text-decoration: none; cursor: pointer; border: none;
          transition: background 0.2s;
        }
        .success-btn:hover { background: #2fd494; }
        .plan-toggle { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 48px; }
        .plan-toggle-btn {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 8px 20px;
          font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; color: rgba(255,255,255,0.5);
          transition: all 0.2s;
        }
        .plan-toggle-btn-active {
          background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.3); color: #34d399;
        }
        .plan-toggle-save { font-size: 11px; font-weight: 700; color: #34d399; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); border-radius: 20px; padding: 2px 9px; }
        .error-msg { font-size: 12px; color: #f87171; margin-top: 10px; text-align: center; }
        @media (max-width: 768px) {
          .pricing-columns { flex-direction: column !important; align-items: center; }
          .pricing-card { max-width: 100% !important; width: 100%; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, zIndex: 50, background: "rgba(3,10,20,0.92)", backdropFilter: "blur(12px)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src={logoImage} alt="LiveSwell" style={{ height: 32, objectFit: "contain" }} />
        </a>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {isAuthenticated ? (
            <a href="/" style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Open App</a>
          ) : (
            <>
              <a href="/sign-in" style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>Sign In</a>
              <a href="/sign-up" style={{ padding: "8px 20px", borderRadius: 8, background: "#34d399", color: "#030a14", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>Get Started</a>
            </>
          )}
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px 80px" }}>

        {/* ── Success banner ───────────────────────────────────────── */}
        {success && (
          <div className="success-banner">
            {subStatus?.isPro ? (
              <>
                <div className="success-icon">🎉</div>
                <div className="success-title">Welcome to LiveSwell Pro!</div>
                <p className="success-body">
                  Your subscription is active. You now have access to SMS alerts, push notifications, email alerts, and AI surf chat.
                </p>
                <a href="/notifications" className="success-btn">Set Up Alerts →</a>
              </>
            ) : (
              <>
                <div className="success-icon" style={{ fontSize: 36 }}>⏳</div>
                <div className="success-title" style={{ color: "rgba(255,255,255,0.8)" }}>Confirming your subscription…</div>
                <p className="success-body">
                  Payment received — we're waiting for the confirmation to arrive (usually a few seconds).
                  This page will update automatically.
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 24, height: 24, border: "2px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
            <span style={{ color: "#34d399", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>SIMPLE PRICING</span>
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px", lineHeight: 1.1 }}>
            Start free.<br />
            <span style={{ color: "#34d399" }}>Upgrade when conditions call for it.</span>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            Core surf data is always free. Add alerts and AI chat when you're ready to stop missing swells.
          </p>
        </div>

        {/* ── Pricing columns ──────────────────────────────────────── */}
        <div className="pricing-columns" style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "stretch" }}>

          {/* ── Free ─────────────────────────────────────────────── */}
          <div className="pricing-card">
            <div className="pricing-tier-label">Free</div>
            <div className="pricing-price">
              <span className="pricing-price-free">$0</span>
            </div>
            <p className="pricing-desc">Everything you need to read the ocean — no card required.</p>

            <button
              className={`pricing-btn ${isProUser ? "pricing-btn-free" : "pricing-btn-free"}`}
              onClick={() => !isAuthenticated && navigate("/sign-up")}
              disabled={isAuthenticated}
              style={isAuthenticated ? { cursor: "default", opacity: 0.45 } : {}}
            >
              {isAuthenticated ? "Your current plan" : "Get started free"}
            </button>

            <hr className="pricing-divider" />
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>What's included</div>
            {FREE_FEATURES.map(f => (
              <div key={f.text} className="pricing-feature">
                <span className="pricing-feature-icon">{f.icon}</span>
                <span className="pricing-feature-text">{f.text}</span>
              </div>
            ))}
          </div>

          {/* ── Pro ──────────────────────────────────────────────── */}
          <div className="pricing-card pricing-card-pro">
            <div className="pricing-badge">⭐ PRO</div>

            {/* Monthly / Annual toggle */}
            <PlanToggle
              onSubscribe={handleSubscribe}
              isLoading={checkout.isPending}
              isAuthenticated={isAuthenticated}
              isProUser={isProUser}
              statusUnknown={statusUnknown}
              checkoutError={checkoutError}
            />
          </div>
        </div>

        {/* ── Manage subscription link ─────────────────────────────── */}
        {isAuthenticated && isProUser && (
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Pro subscriber · <a href="/profile" style={{ color: "rgba(52,211,153,0.7)", textDecoration: "underline" }}>Manage billing</a>
          </p>
        )}

        {/* ── FAQ / trust strip ─────────────────────────────────────── */}
        <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 56 }}>
          {[
            { icon: "🔒", title: "Secure checkout", body: "Payments are processed by Whop — we never store your card details." },
            { icon: "🔄", title: "Cancel anytime", body: "No lock-in. Cancel from your account page before the next billing date." },
            { icon: "📋", title: "Subscription terms", body: <span>By subscribing you agree to our <a href="/terms" style={{ color: "rgba(52,211,153,0.7)", textDecoration: "underline" }}>Terms of Service</a>. Auto-renews until cancelled.</span> },
          ].map(item => (
            <div key={item.title} style={{ textAlign: "center", padding: "0 8px" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Minimal footer ─────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 32px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
        © {new Date().getFullYear()} LiveSwell · <a href="/terms" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}>Terms</a> · <a href="/privacy" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}>Privacy</a>
      </div>
    </div>
  );
}

// ─── Plan toggle sub-component ─────────────────────────────────────────────
function PlanToggle({ onSubscribe, isLoading, isAuthenticated, isProUser, statusUnknown, checkoutError }: {
  onSubscribe: (planId: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProUser: boolean;
  statusUnknown: boolean;
  checkoutError: string | null;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const isMonthly = billing === "monthly";

  const monthlyId = MONTHLY_PLAN_ID;
  const annualId  = ANNUAL_PLAN_ID;
  const planId    = isMonthly ? monthlyId : annualId;
  const plansConfigured = !!(monthlyId || annualId);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Billing</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`plan-toggle-btn ${isMonthly ? "plan-toggle-btn-active" : ""}`}
            onClick={() => setBilling("monthly")}
          >Monthly</button>
          <button
            className={`plan-toggle-btn ${!isMonthly ? "plan-toggle-btn-active" : ""}`}
            onClick={() => setBilling("annual")}
          >
            Annual <span className="plan-toggle-save">Save 50%</span>
          </button>
        </div>
      </div>

      <div className="pricing-price" style={{ marginBottom: 4 }}>
        <span className="pricing-price-amount" style={{ color: "#34d399" }}>
          {isMonthly ? "$4.99" : "$29.99"}
        </span>
        <span className="pricing-price-period">/{isMonthly ? "mo" : "yr"}</span>
      </div>
      {!isMonthly && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
          ≈ $2.50/mo · billed annually
        </div>
      )}

      <p className="pricing-desc" style={{ marginTop: 8 }}>
        {isMonthly
          ? "Alerts, AI chat, and everything in Free — billed monthly."
          : "Alerts, AI chat, and everything in Free — billed once per year."}
      </p>

      {/* While auth or subscription status is resolving, always show a disabled
          placeholder — this prevents a Pro user from opening a duplicate checkout
          during the window before their isPro flag arrives from the server. */}
      {statusUnknown ? (
        <button className="pricing-btn pricing-btn-pro" disabled style={{ opacity: 0.5 }}>
          Loading…
        </button>
      ) : isProUser ? (
        <button className="pricing-btn pricing-btn-current" disabled>
          ✓ Current plan
        </button>
      ) : (
        <button
          className="pricing-btn pricing-btn-pro"
          disabled={isLoading || !plansConfigured}
          onClick={() => planId && onSubscribe(planId)}
        >
          {isLoading
            ? "Redirecting…"
            : !plansConfigured
              ? "Coming soon"
              : isAuthenticated
                ? `Subscribe — ${isMonthly ? "$4.99/mo" : "$29.99/yr"}`
                : `Get Pro — ${isMonthly ? "$4.99/mo" : "$29.99/yr"}`}
        </button>
      )}

      {checkoutError && (
        <p className="error-msg">Error: {checkoutError}</p>
      )}

      <hr className="pricing-divider" />
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>What's included</div>
      {PRO_FEATURES.map(f => (
        <div key={f.text} className="pricing-feature">
          <span className="pricing-feature-icon">{f.icon}</span>
          <span className="pricing-feature-text">{f.text}</span>
        </div>
      ))}
    </>
  );
}
