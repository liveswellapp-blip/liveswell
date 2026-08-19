import express, { type Express, type Request, type Response } from "express";
import { runMigrations as runStripeMigrations } from "stripe-replit-sync";
import { constructStripeWebhookEvent, getStripeSync } from "./stripe-client";
import { processStripeBillingEvent } from "./stripe-billing";

const STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";

/**
 * Register before express.json(). Stripe signatures are calculated against the
 * original bytes, so parsing the body first makes verification impossible.
 */
export function registerStripeWebhook(app: Express): void {
  app.post(
    STRIPE_WEBHOOK_PATH,
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"];
      if (!signature || Array.isArray(signature)) {
        return res.status(400).json({ error: "Missing Stripe signature" });
      }
      if (!Buffer.isBuffer(req.body)) {
        console.error("[stripe/webhook] Expected an unparsed Buffer body.");
        return res.status(500).json({ error: "Stripe webhook body was parsed too early" });
      }

      let event;
      try {
        event = await constructStripeWebhookEvent(req.body, signature);
      } catch (error) {
        console.warn("[stripe/webhook] Signature verification failed:", error);
        return res.status(400).json({ error: "Invalid Stripe webhook signature" });
      }

      try {
        const stripeSync = await getStripeSync();
        await stripeSync.processWebhook(req.body, signature);
        await processStripeBillingEvent(event);
        return res.status(200).json({ received: true });
      } catch (error) {
        console.error("[stripe/webhook] Verified event processing failed:", error);
        return res.status(500).json({ error: "Stripe webhook processing failed" });
      }
    },
  );
}

/**
 * Initializes only Stripe-owned tables and managed webhook infrastructure.
 *
 * This intentionally has no effect on LiveSwell's Pro gate yet: Whop remains
 * the active checkout provider until the later subscription-backend cutover.
 */
export async function initializeStripeSync(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Stripe synchronization.");
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (!domain) {
    throw new Error("REPLIT_DOMAINS is required to configure the managed Stripe webhook.");
  }

  await runStripeMigrations({ databaseUrl, logger: console });

  const stripeSync = await getStripeSync();
  const webhookUrl = `https://${domain}${STRIPE_WEBHOOK_PATH}`;
  await stripeSync.findOrCreateManagedWebhook(webhookUrl);

  // The Stripe schema is managed entirely by stripe-replit-sync. Backfill
  // before billing routes are introduced so catalog and lifecycle reads start
  // from a complete view of the connected Stripe account.
  await stripeSync.syncBackfill({ object: "all" });
  console.log(`[stripe] Sync ready; managed webhook: ${webhookUrl}`);
}
