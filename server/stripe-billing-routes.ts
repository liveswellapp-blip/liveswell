import type { Express, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { isAuthenticated } from "./auth";
import { getCheckoutProvider } from "./billing-cutover";
import {
  BillingRequestError,
  changeStripePlan,
  completeStripePaymentMethodSetup,
  createStripePaymentMethodSetup,
  createStripeBillingPortalSession,
  createStripeSubscriptionSession,
  getStripeInvoiceDocument,
  getBillingStatus,
  setStripeCancellation,
} from "./stripe-billing";

const requestIdSchema = z.string().uuid();

function sendBillingError(res: Response, error: unknown): Response {
  if (error instanceof BillingRequestError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
  }
  console.error("[stripe/billing] Unhandled billing error:", error);
  return res.status(500).json({ error: "billing_request_failed" });
}

export function registerStripeBillingRoutes(app: Express): void {
  app.post(
    "/api/stripe/subscription",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({
        plan: z.enum(["monthly", "annual"]),
        confirmWhopMigration: z.boolean().optional().default(false),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_plan",
          message: "Plan must be monthly or annual.",
        });
      }

      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });

      try {
        if (await getCheckoutProvider(userId) !== "stripe") {
          return res.status(409).json({
            error: "stripe_checkout_disabled",
            message: "Stripe checkout is temporarily disabled. Use the current checkout provider.",
          });
        }
        return res.json(await createStripeSubscriptionSession(userId, parsed.data.plan, {
          confirmWhopMigration: parsed.data.confirmWhopMigration,
        }));
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/subscription/cancel",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({ requestId: requestIdSchema }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_request" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        await setStripeCancellation(userId, true, parsed.data.requestId);
        return res.json({ ok: true });
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/subscription/resume",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({ requestId: requestIdSchema }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_request" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        await setStripeCancellation(userId, false, parsed.data.requestId);
        return res.json({ ok: true });
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/subscription/plan",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({
        plan: z.enum(["monthly", "annual"]),
        requestId: requestIdSchema,
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_request" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        await changeStripePlan(userId, parsed.data.plan, parsed.data.requestId);
        return res.json({ ok: true });
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/payment-method/setup",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({ requestId: requestIdSchema }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_request" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        return res.json(await createStripePaymentMethodSetup(userId, parsed.data.requestId));
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/payment-method/complete",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.object({ setupIntentId: z.string().regex(/^seti_/)}).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_setup_intent" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        await completeStripePaymentMethodSetup(userId, parsed.data.setupIntentId);
        return res.json({ ok: true });
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.get(
    "/api/stripe/invoices/:invoiceId/document",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const parsed = z.string().regex(/^in_/).safeParse(req.params.invoiceId);
      if (!parsed.success) return res.status(400).json({ error: "invalid_invoice" });
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });
      try {
        const { url } = await getStripeInvoiceDocument(userId, parsed.data);
        return res.redirect(303, url);
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.get(
    "/api/billing/subscription",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });

      try {
        return res.json(await getBillingStatus(userId));
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );

  app.post(
    "/api/stripe/billing-portal",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });

      try {
        return res.json(await createStripeBillingPortalSession(userId));
      } catch (error) {
        return sendBillingError(res, error);
      }
    },
  );
}