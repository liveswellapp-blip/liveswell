import { useState } from "react";
import { Link } from "wouter";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      setSent(true);
    } catch {
      // Still show success to avoid email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030a14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logoImage} alt="LiveSwell" style={{ height: 36, objectFit: "contain" }} />
        </div>

        <div style={{ background: "#041a2e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 28px" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
              <h1 style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Check your email</h1>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                If an account exists for <strong style={{ color: "#94a3b8" }}>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link href="/login" style={{ color: "#34d399", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Reset your password</h1>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px" }}>
                Enter your email and we'll send you a link to set a new password.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: loading ? "rgba(16,185,129,0.5)" : "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 20, margin: "20px 0 0" }}>
                <Link href="/login" style={{ color: "#34d399", fontSize: 14, textDecoration: "none" }}>← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
