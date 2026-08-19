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
import { recordBillingOperation, recordCheckoutOutcome } from "./billing-observability";
import { safeLogger } from "./safe-logging";

const requestIdSchema = z.string().uuid();

async function sendBillingError(
  res: Response,
  error: unknown,
  context: { operation: string; userId: string },
): Promise<Response> {
  if (error instanceof BillingRequestError) {
    if (error.statusCode >= 500) {
      await recordBillingOperation({
        ...context,
        status: "failure",
        provider: "stripe",
        code: error.code,
        unexpectedError: true,
      });
      if (context.operation === "checkout") {
        await recordCheckoutOutcome("stripe", "technical_failure");
      }
    }
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
  }
  safeLogger.error("[stripe/billing] Unhandled billing error", context);
  await recordBillingOperation({
    ...context,
    status: "failure",
    provider: "stripe",
    code: "billing_request_failed",
    unexpectedError: true,
  });
  if (context.operation === "checkout") {
    await recordCheckoutOutcome("stripe", "technical_failure");
  }
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
        const result = await createStripeSubscriptionSession(userId, parsed.data.plan, {
          confirmWhopMigration: parsed.data.confirmWhopMigration,
        });
        await recordCheckoutOutcome("stripe", "success");
        return res.json(result);
      } catch (error) {
        return await sendBillingError(res, error, { operation: "checkout", userId });
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
        return await sendBillingError(res, error, { operation: "cancel", userId });
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
        return await sendBillingError(res, error, { operation: "resume", userId });
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
        return await sendBillingError(res, error, { operation: "plan_change", userId });
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
        const result = await createStripePaymentMethodSetup(userId, parsed.data.requestId);
        return res.json(result);
      } catch (error) {
        return await sendBillingError(res, error, { operation: "payment_method_setup", userId });
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
        return await sendBillingError(res, error, { operation: "payment_method_complete", userId });
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
        return await sendBillingError(res, error, { operation: "invoice_document", userId });
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
        return await sendBillingError(res, error, { operation: "status", userId });
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
        const result = await createStripeBillingPortalSession(userId);
        return res.json(result);
      } catch (error) {
        return await sendBillingError(res, error, { operation: "billing_portal", userId });
      }
    },
  );
}