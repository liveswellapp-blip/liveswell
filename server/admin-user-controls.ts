/**
 * Admin user-management endpoints: delete, suspend/unsuspend, plan override
 * (comp), and profile editing. Extracted from routes.ts so the handlers can be
 * integration-tested with mocked DB/Clerk (see admin-user-controls.test.ts).
 */
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { clerkClient } from "@clerk/express";
import { eq, inArray } from "drizzle-orm";
import {
  users, userAlerts, favorites, userProfiles, notificationSettings,
  pushSubscriptions, alertTriggerLog, agentConversations, agentSmsThreads,
  verifiedPhones, smsRateLimits, apnsDeviceTokens, fcmDeviceTokens,
  phoneVerificationTokens, userEvents,
} from "@shared/schema";
import { getWhopClient } from "./whopClient";
import { transitionProStatus } from "./pro-transitions";

export function registerAdminUserControls(app: Express, requireAdminAuth: RequestHandler): void {
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
      if (user.whopMembershipId) {
        try {
          const whopClient = await getWhopClient();
          await whopClient.memberships.cancel(user.whopMembershipId, {
            cancellation_mode: 'immediate',
          });
          console.log(`✅ Cancelled Whop membership ${user.whopMembershipId} for user ${userId}`);
        } catch (whopErr) {
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
      res.status(204).end();
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
}
