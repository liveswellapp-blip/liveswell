/**
 * Admin user-management endpoints: delete, suspend/unsuspend, plan override
 * (comp), profile editing, and admin-triggered password reset.
 * Extracted from routes.ts so the handlers can be integration-tested with
 * mocked DB/Clerk (see admin-user-controls.test.ts).
 */
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { clerkClient } from "@clerk/express";
import { ReplitConnectors } from '@replit/connectors-sdk';
import { eq, inArray } from "drizzle-orm";
import {
  users, userAlerts, favorites, userProfiles, notificationSettings,
  pushSubscriptions, alertTriggerLog, agentConversations, agentSmsThreads,
  verifiedPhones, smsRateLimits, apnsDeviceTokens, fcmDeviceTokens,
  phoneVerificationTokens, userEvents,
} from "@shared/schema";
import { getWhopClient } from "./whopClient";
import { transitionProStatus } from "./pro-transitions";
import { EmailService } from "./email-service";

export function registerAdminUserControls(app: Express, requireAdminAuth: RequestHandler): void {
  // ── Create a new user account (Clerk + local DB) ─────────────────────────
  app.post("/api/admin/users", requireAdminAuth, async (req, res) => {
    try {
      const { email, password, firstName, lastName, grantPro } = req.body as {
        email?: string;
        password?: string;
        firstName?: string | null;
        lastName?: string | null;
        grantPro?: boolean;
      };

      // Validate required fields
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "A valid email address is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanFirst = typeof firstName === "string" ? firstName.trim() || null : null;
      const cleanLast = typeof lastName === "string" ? lastName.trim() || null : null;

      // Check local DB for email uniqueness before hitting Clerk
      const existing = await storage.getUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ message: "An account with that email address already exists" });
      }

      // Create the Clerk identity — this is the source of truth for sign-in
      let clerkUser: Awaited<ReturnType<typeof clerkClient.users.createUser>>;
      try {
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [cleanEmail],
          password,
          firstName: cleanFirst ?? undefined,
          lastName: cleanLast ?? undefined,
          skipPasswordChecks: false,
        });
      } catch (clerkErr: any) {
        const detail = clerkErr?.errors?.[0]?.longMessage
          ?? clerkErr?.errors?.[0]?.message
          ?? "Clerk rejected the request";
        return res.status(422).json({ message: `Could not create sign-in account: ${detail}` });
      }

      // Upsert the local user row (same path as the post-login reconciliation)
      const newUser = await storage.upsertUser({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? cleanEmail,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      });

      // Send a welcome email so the user knows their account exists.
      // We generate a short-lived Clerk sign-in token so the user can sign in
      // and set their own password without needing to know the admin-supplied one.
      // Non-fatal — account creation succeeds even if email delivery fails.
      (async () => {
        try {
          const APP_BASE_URL = "https://liveswell.io";
          const tokenResponse = await clerkClient.signInTokens.createSignInToken({
            userId: clerkUser.id,
            expiresInSeconds: 7 * 24 * 60 * 60, // 7 days
          });
          const welcomeUrl =
            `${APP_BASE_URL}/sign-in` +
            `?__clerk_ticket=${tokenResponse.token}` +
            `&redirect_url=${encodeURIComponent("/change-password")}`;
          await EmailService.sendWelcomeEmail(
            newUser.email ?? cleanEmail,
            newUser.firstName ?? null,
            newUser.lastName ?? null,
            welcomeUrl,
          );
        } catch (err) {
          console.warn(`⚠️  Admin create-user: welcome email failed for ${cleanEmail}:`, err);
        }
      })();

      // Optionally grant a complimentary Pro plan
      if (grantPro) {
        try {
          await transitionProStatus(clerkUser.id, true, "comp");
        } catch (proErr) {
          // Non-fatal — account was created; admin can grant Pro separately
          console.warn(`⚠️  Admin create-user: account created but Pro grant failed for ${clerkUser.id}:`, proErr);
        }
      }

      console.log(`✅ Admin created user ${clerkUser.id} (${cleanEmail})${grantPro ? " with Pro" : ""}`);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Admin create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // ── Permanently delete a user and all their data ─────────────────────────
  app.delete("/api/admin/users/:userId", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Cancel the Whop membership BEFORE deleting local data so the user
      // stops being billed. A failure here is logged as a warning but does
      // not block deletion — admins can cancel manually in the Whop dashboard
      // if the API is temporarily unavailable.
      let whopCancellationFailed = false;
      const attemptedMembershipId = user.whopMembershipId ?? null;
      if (user.whopMembershipId) {
        try {
          const whopClient = await getWhopClient();
          await whopClient.memberships.cancel(user.whopMembershipId, {
            cancellation_mode: 'immediate',
          });
          console.log(`✅ Cancelled Whop membership ${user.whopMembershipId} for user ${userId}`);
        } catch (whopErr) {
          whopCancellationFailed = true;
          console.warn(
            `⚠️  Failed to cancel Whop membership ${user.whopMembershipId} for user ${userId} — ` +
            `the local account will still be deleted but the membership may need manual cancellation in the Whop dashboard.`,
            whopErr,
          );
        }
      }

      // Delete the Clerk sign-in account FIRST. If Clerk fails we abort with
      // an error and touch no local data — otherwise a Clerk outage would
      // leave a live sign-in identity that recreates the local row on the
      // user's next authenticated request. A 404 from Clerk means the account
      // is already gone, which is fine. Legacy IDs have no Clerk account.
      if (userId.startsWith("user_")) {
        try {
          await clerkClient.users.deleteUser(userId);
        } catch (clerkErr: any) {
          if (clerkErr?.status !== 404) {
            console.error(`Clerk deleteUser failed for ${userId}:`, clerkErr);
            return res.status(502).json({
              message: "Could not delete the user's sign-in account (Clerk error). No data was deleted — please try again.",
            });
          }
        }
      }

      // Collect every phone number associated with the user so their SMS
      // conversation threads (keyed by phone, not userId) are purged too.
      const phones = new Set<string>();
      const [verifiedRows, alertRows, notifRows] = await Promise.all([
        db.select({ phone: verifiedPhones.phone }).from(verifiedPhones).where(eq(verifiedPhones.userId, userId)),
        db.select({ phone: userAlerts.phoneNumber, id: userAlerts.id }).from(userAlerts).where(eq(userAlerts.userId, userId)),
        db.select({ phone: notificationSettings.phoneNumber }).from(notificationSettings).where(eq(notificationSettings.userId, userId)),
      ]);
      for (const r of [...verifiedRows, ...alertRows, ...notifRows]) {
        if (r.phone) phones.add(r.phone);
      }
      const alertIds = alertRows.map((r) => r.id).filter((id): id is number => typeof id === "number");

      await db.transaction(async (tx) => {
        if (alertIds.length > 0) {
          await tx.delete(alertTriggerLog).where(inArray(alertTriggerLog.alertId, alertIds));
        }
        await tx.delete(userAlerts).where(eq(userAlerts.userId, userId));
        await tx.delete(favorites).where(eq(favorites.userId, userId));
        await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));
        await tx.delete(notificationSettings).where(eq(notificationSettings.userId, userId));
        await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
        await tx.delete(agentConversations).where(eq(agentConversations.userId, userId));
        if (phones.size > 0) {
          await tx.delete(agentSmsThreads).where(inArray(agentSmsThreads.phoneNumber, Array.from(phones)));
        }
        await tx.delete(verifiedPhones).where(eq(verifiedPhones.userId, userId));
        await tx.delete(smsRateLimits).where(eq(smsRateLimits.userId, userId));
        await tx.delete(apnsDeviceTokens).where(eq(apnsDeviceTokens.userId, userId));
        await tx.delete(fcmDeviceTokens).where(eq(fcmDeviceTokens.userId, userId));
        await tx.delete(phoneVerificationTokens).where(eq(phoneVerificationTokens.userId, userId));
        await tx.delete(userEvents).where(eq(userEvents.userId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });

      console.log(`🗑️  Admin deleted user ${userId} (${user.email ?? "no email"})`);
      if (whopCancellationFailed) {
        res.status(200).json({
          deleted: true,
          whopCancellationFailed: true,
          whopMembershipId: attemptedMembershipId,
        });
      } else {
        res.status(204).end();
      }
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ── Suspend / unsuspend a user ───────────────────────────────────────────
  app.post("/api/admin/users/:userId/suspend", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { suspend } = req.body as { suspend?: boolean };
      if (typeof suspend !== "boolean") {
        return res.status(400).json({ message: "suspend (boolean) is required" });
      }

      const [updated] = await db
        .update(users)
        .set({ isSuspended: suspend, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) return res.status(404).json({ message: "User not found" });

      console.log(`${suspend ? "⛔" : "✅"} Admin ${suspend ? "suspended" : "unsuspended"} user ${userId}`);
      res.json(updated);
    } catch (error) {
      console.error("Admin suspend user error:", error);
      res.status(500).json({ message: "Failed to update suspension" });
    }
  });

  // ── Grant / revoke a complimentary Pro plan ──────────────────────────────
  // Separate from test access: sets isPro only, never touches isTestAccount
  // or whopMembershipId. Revoking refuses to downgrade a paying Whop member.
  app.post("/api/admin/users/:userId/plan-override", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { grantPro } = req.body as { grantPro?: boolean };
      if (typeof grantPro !== "boolean") {
        return res.status(400).json({ message: "grantPro (boolean) is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!grantPro && user.whopMembershipId) {
        return res.status(409).json({
          message: "This user has an active Whop subscription — revoking a comp would cancel a paying plan. Manage their subscription in Whop instead.",
        });
      }

      // transitionProStatus conditions its UPDATE on the prior isPro value and
      // inserts the audit event in the same transaction — both succeed or both
      // roll back.  Returns { changed: false } when already in target state.
      await transitionProStatus(userId, grantPro, "comp");

      // Fetch and return the updated row.
      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      res.json(updated);
    } catch (error) {
      console.error("Admin plan-override error:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  // ── Edit a user's profile (name + email) ─────────────────────────────────
  app.put("/api/admin/users/:userId/profile", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email } = req.body as {
        firstName?: string | null; lastName?: string | null; email?: string;
      };

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const newEmail = typeof email === "string" ? email.trim().toLowerCase() : user.email;
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      // Email uniqueness — reject if another user already owns it
      if (newEmail !== user.email) {
        const existing = await storage.getUserByEmail(newEmail);
        if (existing && existing.id !== userId) {
          return res.status(409).json({ message: "That email address is already in use by another account" });
        }
      }

      const newFirst = typeof firstName === "string" ? firstName.trim() || null : user.firstName;
      const newLast = typeof lastName === "string" ? lastName.trim() || null : user.lastName;

      // Update Clerk first so a Clerk failure never leaves the local DB out of
      // sync. Every step here is idempotent, so a failed save can simply be
      // retried: the local DB is only written after Clerk fully succeeds.
      if (userId.startsWith("user_")) {
        try {
          // Clerk clears a name when passed null (typed as string, hence cast)
          await clerkClient.users.updateUser(userId, {
            firstName: newFirst,
            lastName: newLast,
          } as any);

          if (newEmail !== user.email) {
            const clerkUser = await clerkClient.users.getUser(userId);
            // Reuse an existing matching address (makes retries idempotent)
            let target = clerkUser.emailAddresses.find(
              (ea) => ea.emailAddress.toLowerCase() === newEmail,
            );
            if (target) {
              await clerkClient.users.updateUser(userId, { primaryEmailAddressID: target.id });
            } else {
              target = await clerkClient.emailAddresses.createEmailAddress({
                userId,
                emailAddress: newEmail,
                verified: true,
                primary: true,
              });
            }
            // Remove the old address(es) so the stale email can't be used to
            // sign in. Failures propagate — the DB is not updated and the
            // admin is told to retry.
            for (const ea of clerkUser.emailAddresses) {
              if (ea.id !== target.id) {
                await clerkClient.emailAddresses.deleteEmailAddress(ea.id);
              }
            }
          }
        } catch (clerkErr: any) {
          console.error("Clerk profile update failed:", clerkErr);
          const detail = clerkErr?.errors?.[0]?.message ?? "Clerk rejected the update";
          return res.status(502).json({
            message: `Could not update the sign-in account: ${detail}. No changes were saved — please try again.`,
          });
        }
      }

      const [updated] = await db
        .update(users)
        .set({ firstName: newFirst, lastName: newLast, email: newEmail, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Admin edit profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ── Admin-triggered password reset ──────────────────────────────────────
  // Creates a short-lived Clerk sign-in token and emails the user a link
  // they can click to sign in and then set a new password in account settings.
  app.post("/api/admin/users/:userId/reset-password", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.email) return res.status(422).json({ message: "This user has no email address on file" });

      if (!userId.startsWith("user_")) {
        return res.status(422).json({ message: "Password reset is only supported for Clerk-managed accounts" });
      }

      // Create a short-lived sign-in token via the Clerk Backend API.
      // The token is valid for 24 h and produces a URL the user clicks to
      // authenticate; from there they can navigate to settings and change
      // their password.
      let signInToken: string;
      try {
        const tokenResponse = await clerkClient.signInTokens.createSignInToken({
          userId,
          expiresInSeconds: 86400, // 24 hours
        });
        signInToken = tokenResponse.token;
      } catch (clerkErr: any) {
        const detail = clerkErr?.errors?.[0]?.longMessage
          ?? clerkErr?.errors?.[0]?.message
          ?? "Clerk rejected the request";
        console.error(`Clerk createSignInToken failed for ${userId}:`, clerkErr);
        return res.status(502).json({ message: `Could not generate reset link: ${detail}` });
      }

      const APP_BASE_URL = "https://liveswell.io";
      // After Clerk processes the one-time ticket on /sign-in it follows
      // redirect_url, landing the user directly on the password-change page.
      const resetUrl = `${APP_BASE_URL}/sign-in?__clerk_ticket=${signInToken}&redirect_url=${encodeURIComponent("/change-password")}`;
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      const FALLBACK_FROM = "LiveSwell <onboarding@resend.dev>";
      const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || FALLBACK_FROM;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:#0f172a;padding:28px 32px;text-align:center">
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">🌊 LiveSwell</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:700">Set your password</h2>
          <p style="margin:0 0 8px;color:#475569;font-size:15px">Hi ${displayName},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">
            A LiveSwell admin has sent you a sign-in link to help you access your account.
            Click the button below to sign in, then visit your account settings to set a new password.
          </p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="${resetUrl}"
               style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;
                      text-decoration:none;padding:13px 28px;border-radius:8px">
              Sign in to your account
            </a>
          </div>
          <p style="margin:0 0 6px;color:#94a3b8;font-size:13px">This link expires in 24 hours and can only be used once.</p>
          <p style="margin:0;color:#94a3b8;font-size:13px">If you didn't expect this email, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© LiveSwell · <a href="${APP_BASE_URL}" style="color:#94a3b8">liveswell.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const text = `Hi ${displayName},\n\nA LiveSwell admin has sent you a sign-in link to help you access your account.\n\nClick the link below to sign in, then visit your account settings to set a new password:\n\n${resetUrl}\n\nThis link expires in 24 hours and can only be used once.\n\nIf you didn't expect this email, you can safely ignore it.\n\n— The LiveSwell Team`;

      const connectors = new ReplitConnectors();
      const emailResponse = await connectors.proxy("resend", "/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: user.email,
          subject: "Sign in to LiveSwell — set your password",
          text,
          html,
        }),
      });

      if (!emailResponse.ok) {
        const errBody = await emailResponse.text();
        console.error(`Password reset email failed for ${userId} (${user.email}): ${errBody}`);
        return res.status(502).json({ message: "Sign-in link generated but email delivery failed — please try again." });
      }

      console.log(`📧 Admin sent password-reset email to ${user.email} (${userId})`);
      res.json({ sent: true, email: user.email });
    } catch (error) {
      console.error("Admin password reset error:", error);
      res.status(500).json({ message: "Failed to send password reset email" });
    }
  });
}
