import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

let mockUserId: string | null = "user_free";

const mocks = vi.hoisted(() => ({
  createStripeBillingPortalSession: vi.fn(),
  createStripeSubscriptionSession: vi.fn(),
  changeStripePlan: vi.fn(),
  completeStripePaymentMethodSetup: vi.fn(),
  createStripePaymentMethodSetup: vi.fn(),
  getStripeInvoiceDocument: vi.fn(),
  getBillingStatus: vi.fn(),
  setStripeCancellation: vi.fn(),
  getCheckoutProvider: vi.fn(),
  recordBillingOperation: vi.fn(),
  recordCheckoutOutcome: vi.fn(),
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
  changeStripePlan: mocks.changeStripePlan,
  completeStripePaymentMethodSetup: mocks.completeStripePaymentMethodSetup,
  createStripePaymentMethodSetup: mocks.createStripePaymentMethodSetup,
  getStripeInvoiceDocument: mocks.getStripeInvoiceDocument,
  getBillingStatus: mocks.getBillingStatus,
  setStripeCancellation: mocks.setStripeCancellation,
}));

vi.mock("./billing-cutover", () => ({
  getCheckoutProvider: mocks.getCheckoutProvider,
}));
vi.mock("./billing-observability", () => ({
  recordBillingOperation: mocks.recordBillingOperation,
  recordCheckoutOutcome: mocks.recordCheckoutOutcome,
}));

import { registerStripeBillingRoutes } from "./stripe-billing-routes";

function buildApp() {
  const app = express();
  app.use(express.json());
  registerStripeBillingRoutes(app);
  return app;
}

describe("Stripe billing route contracts", () => {
  beforeEach(() => {
    mocks.getCheckoutProvider.mockResolvedValue("stripe");
    mocks.recordBillingOperation.mockResolvedValue(undefined);
    mocks.recordCheckoutOutcome.mockResolvedValue(undefined);
  });
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
      { confirmWhopMigration: false },
    );
    expect(mocks.recordCheckoutOutcome).toHaveBeenCalledWith("stripe", "success");
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

  it("requires a retry token before canceling a Stripe subscription", async () => {
    const response = await request(buildApp())
      .post("/api/stripe/subscription/cancel")
      .send({});

    expect(response.status).toBe(400);
    expect(mocks.setStripeCancellation).not.toHaveBeenCalled();
  });

  it("passes the signed-in user and idempotency request ID to a cancellation", async () => {
    mocks.setStripeCancellation.mockResolvedValue(undefined);

    const response = await request(buildApp())
      .post("/api/stripe/subscription/cancel")
      .send({ requestId: "11111111-1111-4111-8111-111111111111" });

    expect(response.status).toBe(200);
    expect(mocks.setStripeCancellation).toHaveBeenCalledWith(
      "user_free",
      true,
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("does not accept unrecognized plans for a billing change", async () => {
    const response = await request(buildApp())
      .post("/api/stripe/subscription/plan")
      .send({ plan: "forever", requestId: "11111111-1111-4111-8111-111111111111" });

    expect(response.status).toBe(400);
    expect(mocks.changeStripePlan).not.toHaveBeenCalled();
  });

  it("redirects only the ownership-checked invoice document URL", async () => {
    mocks.getStripeInvoiceDocument.mockResolvedValue({ url: "https://stripe.example/invoice.pdf" });

    const response = await request(buildApp()).get("/api/stripe/invoices/in_1/document");

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe("https://stripe.example/invoice.pdf");
    expect(mocks.getStripeInvoiceDocument).toHaveBeenCalledWith("user_free", "in_1");
  });
});