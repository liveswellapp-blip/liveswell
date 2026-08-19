import type { Express, RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { db } from "./db";
import { users } from "@shared/schema";
import { isAuthenticated } from "./auth";
import {
  getBillingCutoverConfig,
  getCheckoutProvider,
  getDefaultCheckoutProvider,
  setBillingCutoverConfig,
} from "./billing-cutover";
import {
  BillingRequestError,
  createStripeSubscriptionSession,
} from "./stripe-billing";
import {
  createWhopCheckoutForPlan,
  WhopCheckoutError,
} from "./whop-routes";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
  confirmWhopMigration: z.boolean().optional().default(false),
});

export function registerBillingMigrationRoutes(
  app: Express,
  requireAdminAuth: RequestHandler,
): void {
  app.get("/api/billing/checkout-config", async (req, res) => {
    try {
      const config = await getBillingCutoverConfig();
      const assignedProvider = await getCheckoutProvider(getAuth(req).userId ?? undefined);
      return res.json({
        ...config,
        assignedProvider,
        defaultProvider: getDefaultCheckoutProvider(),
      });
    } catch (error) {
      console.error("[billing/cutover] Failed to load checkout config:", error);
      return res.status(503).json({ error: "billing_cutover_unavailable" });
    }
  });

  app.post("/api/billing/checkout", isAuthenticated, async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_checkout_request" });
    const userId = getAuth(req).userId;
    if (!userId) return res.status(401).json({ error: "unauthenticated" });

    try {
      const provider = await getCheckoutProvider(userId);
      if (provider === "whop") {
        const result = await createWhopCheckoutForPlan(userId, parsed.data.plan);
        return res.json({ provider, ...result });
      }
      const result = await createStripeSubscriptionSession(userId, parsed.data.plan, {
        confirmWhopMigration: parsed.data.confirmWhopMigration,
      });
      return res.json({ provider, ...result });
    } catch (error) {
      if (error instanceof BillingRequestError || error instanceof WhopCheckoutError) {
        return res.status(error.statusCode).json({ error: error.code, message: error.message });
      }
      console.error("[billing/checkout] Failed:", error);
      return res.status(500).json({ error: "billing_checkout_failed" });
    }
  });

  app.get("/api/admin/billing-migration", requireAdminAuth, async (_req, res) => {
    try {
      const [config, accountRows] = await Promise.all([
        getBillingCutoverConfig(),
        db.select({
          id: users.id,
          email: users.email,
          billingProvider: users.billingProvider,
          paidPro: users.paidPro,
          migrationState: users.billingMigrationState,
          migrationStartedAt: users.billingMigrationStartedAt,
        }).from(users),
      ]);
      const summary = {
        stripePaid: 0,
        whopPaid: 0,
        migrationPending: 0,
        awaitingWhopCancellation: 0,
        migrationCompleted: 0,
      };
      for (const account of accountRows) {
        if (account.paidPro && account.billingProvider === "stripe") summary.stripePaid += 1;
        if (account.paidPro && account.billingProvider === "whop") summary.whopPaid += 1;
        if (account.migrationState === "whop_to_stripe_pending") summary.migrationPending += 1;
        if (account.migrationState === "awaiting_whop_cancellation") summary.awaitingWhopCancellation += 1;
        if (account.migrationState === "whop_to_stripe_completed") summary.migrationCompleted += 1;
      }
      return res.json({
        ...config,
        defaultProvider: getDefaultCheckoutProvider(),
        summary,
        attentionAccounts: accountRows
          .filter((account) =>
            account.migrationState === "whop_to_stripe_pending" ||
            account.migrationState === "awaiting_whop_cancellation",
          )
          .slice(0, 50)
          .map((account) => ({
            id: account.id,
            email: account.email,
            billingProvider: account.billingProvider,
            migrationState: account.migrationState,
            migrationStartedAt: account.migrationStartedAt,
          })),
      });
    } catch (error) {
      console.error("[admin/billing-migration] Failed to load status:", error);
      return res.status(500).json({ message: "Failed to load billing migration status" });
    }
  });

  app.post("/api/admin/billing-migration", requireAdminAuth, async (req, res) => {
    const parsed = z.object({
      checkoutProvider: z.enum(["stripe", "whop"]),
      stripeRolloutPercent: z.number().int().min(0).max(100),
      confirm: z.literal(true),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "checkoutProvider, stripeRolloutPercent (0–100), and confirm=true are required",
      });
    }
    try {
      await setBillingCutoverConfig(
        parsed.data.checkoutProvider,
        parsed.data.stripeRolloutPercent,
      );
      return res.json(await getBillingCutoverConfig());
    } catch (error) {
      console.error("[admin/billing-migration] Failed to save cutover:", error);
      return res.status(500).json({ message: "Failed to update billing migration controls" });
    }
  });
}