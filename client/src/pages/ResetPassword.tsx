import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#030a14", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <p style={{ marginBottom: 16 }}>This reset link is invalid or missing.</p>
          <Link href="/forgot-password" style={{ color: "#34d399", textDecoration: "none" }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
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
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h1 style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Password updated</h1>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>Your password has been changed. You can now sign in.</p>
              <button
                onClick={() => setLocation("/login")}
                style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Set a new password</h1>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px" }}>Choose a strong password for your account.</p>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>New password <span style={{ color: "#475569", fontWeight: 400 }}>(min. 8 characters)</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: loading ? "rgba(16,185,129,0.5)" : "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
                >
                  {loading ? "Saving…" : "Set Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
