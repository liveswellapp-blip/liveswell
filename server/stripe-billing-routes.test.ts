import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

let mockUserId: string | null = "user_free";

const mocks = vi.hoisted(() => ({
  createStripeBillingPortalSession: vi.fn(),
  createStripeSubscriptionSession: vi.fn(),
  getBillingStatus: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: mockUserId })),
}));

vi.mock("./auth", () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    if (!mockUserId) return res.status(401).json({ error: "unauthenticated" });
    req.auth = { userId: mockUserId };
    return next();
  },
}));

vi.mock("./stripe-billing", () => ({
  BillingRequestError: class BillingRequestError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  createStripeBillingPortalSession: mocks.createStripeBillingPortalSession,
  createStripeSubscriptionSession: mocks.createStripeSubscriptionSession,
  getBillingStatus: mocks.getBillingStatus,
}));

import { registerStripeBillingRoutes } from "./stripe-billing-routes";

function buildApp() {
  const app = express();
  app.use(express.json());
  registerStripeBillingRoutes(app);
  return app;
}

describe("Stripe billing route contracts", () => {
  afterEach(() => {
    mockUserId = "user_free";
    vi.clearAllMocks();
  });

  it("requires authentication before creating a subscription session", async () => {
    mockUserId = null;

    const response = await request(buildApp())
      .post("/api/stripe/subscription")
      .send({ plan: "monthly" });

    expect(response.status).toBe(401);
    expect(mocks.createStripeSubscriptionSession).not.toHaveBeenCalled();
  });

  it("rejects arbitrary price IDs and accepts only monthly or annual plan keys", async () => {
    const response = await request(buildApp())
      .post("/api/stripe/subscription")
      .send({ plan: "price_attacker_controlled" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_plan");
    expect(mocks.createStripeSubscriptionSession).not.toHaveBeenCalled();
  });

  it("returns the embedded checkout bootstrap for an allowlisted plan", async () => {
    mocks.createStripeSubscriptionSession.mockResolvedValue({
      checkoutSessionId: "cs_1",
      clientSecret: "cs_secret_1",
      publishableKey: "pk_test_1",
    });

    const response = await request(buildApp())
      .post("/api/stripe/subscription")
      .send({ plan: "annual" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      checkoutSessionId: "cs_1",
      clientSecret: "cs_secret_1",
      publishableKey: "pk_test_1",
    });
    expect(mocks.createStripeSubscriptionSession).toHaveBeenCalledWith(
      "user_free",
      "annual",
    );
  });

  it("serves the provider-neutral subscription response", async () => {
    mocks.getBillingStatus.mockResolvedValue({
      isPro: true,
      provider: "complimentary",
      plan: null,
      renewsAt: null,
      canManageBilling: false,
      managementType: null,
    });

    const response = await request(buildApp()).get("/api/billing/subscription");

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("complimentary");
    expect(response.body.canManageBilling).toBe(false);
  });
});