import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NO_PASSWORD") {
          setError(data.message + " Use the link below.");
        } else {
          setError(data.message || "Login failed.");
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030a14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logoImage} alt="LiveSwell" style={{ height: 36, objectFit: "contain" }} />
        </div>

        {/* Card */}
        <div style={{ background: "#041a2e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 28px" }}>
          <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Welcome back</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px" }}>Sign in to your LiveSwell account</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
              {error}
            </div>
          )}

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
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Password</label>
                <Link href="/forgot-password" style={{ color: "#34d399", fontSize: 13, textDecoration: "none" }}>Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? "rgba(16,185,129,0.5)" : "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginTop: 20 }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#34d399", textDecoration: "none", fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
