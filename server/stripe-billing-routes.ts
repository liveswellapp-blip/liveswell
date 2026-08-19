import type { Express, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { isAuthenticated } from "./auth";
import {
  BillingRequestError,
  createStripeBillingPortalSession,
  createStripeSubscriptionSession,
  getBillingStatus,
} from "./stripe-billing";

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
      const parsed = z.object({ plan: z.enum(["monthly", "annual"]) }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_plan",
          message: "Plan must be monthly or annual.",
        });
      }

      const userId = getAuth(req).userId;
      if (!userId) return res.status(401).json({ error: "unauthenticated" });

      try {
        return res.json(await createStripeSubscriptionSession(userId, parsed.data.plan));
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