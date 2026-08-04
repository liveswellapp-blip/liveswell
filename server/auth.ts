import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { ReplitConnectors } from "@replit/connectors-sdk";

const FALLBACK_FROM = "LiveSwell <onboarding@resend.dev>";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || FALLBACK_FROM;

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

const registerSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  try {
    const connectors = new ReplitConnectors();
    await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject: "Reset your LiveSwell password",
        text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#030a14;color:#e2e8f0;border-radius:12px;">
            <img src="https://liveswell.app/logo.png" alt="LiveSwell" style="height:32px;margin-bottom:24px;" />
            <h2 style="color:#34d399;margin:0 0 12px;">Reset your password</h2>
            <p style="color:#94a3b8;margin:0 0 24px;">
              You requested a password reset for your LiveSwell account.
              Click the button below to set a new password.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Reset Password
            </a>
            <p style="color:#475569;font-size:13px;margin:24px 0 0;">
              This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // ── Register ────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid input" });
      }
      const { email, password } = result.data;
      const normalised = email.toLowerCase().trim();

      const existing = await storage.getUserByEmail(normalised);
      if (existing) {
        return res.status(409).json({ message: "An account with that email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email: normalised, passwordHash });

      (req.session as any).user = { id: user.id, email: user.email, loginTime: Date.now() };
      return res.status(201).json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  // ── Login ───────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await storage.getUserByEmail((email as string).toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        // Replit-linked account with no password — prompt to use forgot password
        return res.status(403).json({
          message: "This account was set up without a password. Use 'Forgot password' to create one.",
          code: "NO_PASSWORD",
        });
      }

      const match = await bcrypt.compare(password as string, user.passwordHash);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      (req.session as any).user = { id: user.id, email: user.email, loginTime: Date.now() };
      return res.json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  // ── Logout ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Logout error:", err);
      res.json({ message: "Logged out" });
    });
  });

  // ── Forgot password ─────────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    // Always respond 200 to prevent email enumeration
    res.json({ message: "If that email has an account, a reset link has been sent." });

    try {
      const { email } = req.body;
      if (!email) return;

      const user = await storage.getUserByEmail((email as string).toLowerCase().trim());
      if (!user?.email) return;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.createPasswordResetToken({ userId: user.id, token, expiresAt });

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:5000";
      const resetUrl = `https://${domain}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("Forgot-password error:", error);
    }
  });

  // ── Change password (authenticated) ─────────────────────────────────────────
  app.patch("/api/auth/password", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
      }
      if ((newPassword as string).length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters." });
      }

      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (!user.passwordHash) {
        return res.status(400).json({ message: "This account does not have a password set. Use 'Forgot password' to create one." });
      }

      const match = await bcrypt.compare(currentPassword as string, user.passwordHash);
      if (!match) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }

      const samePassword = await bcrypt.compare(newPassword as string, user.passwordHash);
      if (samePassword) {
        return res.status(400).json({ message: "New password must be different from your current password." });
      }

      const passwordHash = await bcrypt.hash(newPassword as string, 12);
      await storage.updateUserPasswordHash(user.id, passwordHash);

      return res.json({ message: "Password updated successfully." });
    } catch (error) {
      console.error("Change-password error:", error);
      return res.status(500).json({ message: "Failed to update password. Please try again." });
    }
  });

  // ── Reset password ──────────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required." });
      }
      if ((password as string).length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const record = await storage.getPasswordResetToken(token as string);
      if (!record || record.expiresAt < new Date()) {
        return res.status(400).json({ message: "This reset link is invalid or has expired." });
      }

      const passwordHash = await bcrypt.hash(password as string, 12);
      await storage.updateUserPasswordHash(record.userId, passwordHash);
      await storage.deletePasswordResetToken(token as string);

      return res.json({ message: "Password updated. You can now log in." });
    } catch (error) {
      console.error("Reset-password error:", error);
      return res.status(500).json({ message: "Reset failed. Please try again." });
    }
  });
}

// ── isAuthenticated middleware ────────────────────────────────────────────────
export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = (req.session as any)?.user;
  if (!user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).user = user;
  next();
};
