import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

let mockUserId: string | null = "user_1";
const accountRows = [
  { billingProvider: "stripe", paidPro: true, migrationState: "awaiting_whop_cancellation" },
  { billingProvider: "whop", paidPro: true, migrationState: "whop_to_stripe_pending" },
];

const mocks = vi.hoisted(() => ({
  createStripeSubscriptionSession: vi.fn(),
  createWhopCheckoutForPlan: vi.fn(),
  getBillingCutoverConfig: vi.fn(),
  getCheckoutProvider: vi.fn(),
  setBillingCutoverConfig: vi.fn(),
  getBillingOperationalSnapshot: vi.fn(),
  recordBillingOperation: vi.fn(),
  recordCheckoutOutcome: vi.fn(),
  resolveBillingOperationalFailure: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: mockUserId })),
}));

vi.mock("./auth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    mockUserId ? next() : res.status(401).json({ error: "unauthenticated" }),
}));

vi.mock("./db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(async () => accountRows),
    })),
  },
}));

vi.mock("./billing-cutover", () => ({
  BillingEmergencyOverrideError: class BillingEmergencyOverrideError extends Error {},
  getBillingCutoverConfig: mocks.getBillingCutoverConfig,
  getCheckoutProvider: mocks.getCheckoutProvider,
  getDefaultCheckoutProvider: () => "stripe",
  setBillingCutoverConfig: mocks.setBillingCutoverConfig,
}));
vi.mock("./billing-observability", () => ({
  getBillingOperationalSnapshot: mocks.getBillingOperationalSnapshot,
  recordBillingOperation: mocks.recordBillingOperation,
  recordCheckoutOutcome: mocks.recordCheckoutOutcome,
  resolveBillingOperationalFailure: mocks.resolveBillingOperationalFailure,
}));

vi.mock("./stripe-billing", () => {
  class BillingRequestError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    BillingRequestError,
    createStripeSubscriptionSession: mocks.createStripeSubscriptionSession,
  };
});

vi.mock("./whop-routes", () => {
  class WhopCheckoutError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    WhopCheckoutError,
    createWhopCheckoutForPlan: mocks.createWhopCheckoutForPlan,
  };
});

import { registerBillingMigrationRoutes } from "./billing-migration-routes";

function makeApp() {
  const app = express();
  app.use(express.json());
  registerBillingMigrationRoutes(app, (req, res, next) =>
    req.header("x-admin") === "yes"
      ? next()
      : res.status(401).json({ error: "admin_auth_required" }),
  );
  return app;
}

describe("billing cutover and migration routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user_1";
    mocks.getBillingCutoverConfig.mockResolvedValue({
      checkoutProvider: "stripe",
      stripeRolloutPercent: 100,
      emergencyOverrideActive: false,
    });
    mocks.getBillingOperationalSnapshot.mockResolvedValue({
      status: "healthy",
      failuresLast24Hours: 0,
      ignoredLast24Hours: 0,
      unresolvedFailures: 0,
      lastSuccessAt: null,
      recentFailures: [],
    });
    mocks.recordBillingOperation.mockResolvedValue(undefined);
    mocks.recordCheckoutOutcome.mockResolvedValue(undefined);
    mocks.resolveBillingOperationalFailure.mockResolvedValue(true);
    mocks.getCheckoutProvider.mockResolvedValue("stripe");
    mocks.createStripeSubscriptionSession.mockResolvedValue({
      checkoutSessionId: "cs_1",
      clientSecret: "secret_1",
      publishableKey: "pk_1",
    });
    mocks.createWhopCheckoutForPlan.mockResolvedValue({
      purchaseUrl: "https://whop.example/checkout",
    });
  });

  it("routes confirmed migration checkout to the assigned Stripe cohort", async () => {
    const response = await request(makeApp()).post("/api/billing/checkout").send({
      plan: "annual",
      confirmWhopMigration: true,
    });
    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("stripe");
    expect(mocks.createStripeSubscriptionSession).toHaveBeenCalledWith(
      "user_1",
      "annual",
      { confirmWhopMigration: true },
    );
    expect(mocks.recordCheckoutOutcome).toHaveBeenCalledWith("stripe", "success");
  });

  it("routes rollback checkout to Whop", async () => {
    mocks.getCheckoutProvider.mockResolvedValue("whop");
    const response = await request(makeApp()).post("/api/billing/checkout").send({
      plan: "monthly",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      provider: "whop",
      purchaseUrl: "https://whop.example/checkout",
    });
    expect(mocks.createWhopCheckoutForPlan).toHaveBeenCalledWith("user_1", "monthly");
    expect(mocks.recordCheckoutOutcome).toHaveBeenCalledWith("whop", "success");
  });

  it("counts a technical checkout failure without counting expected 4xx rejections", async () => {
    mocks.createStripeSubscriptionSession.mockRejectedValueOnce(new Error("provider unavailable"));
    const response = await request(makeApp()).post("/api/billing/checkout").send({
      plan: "monthly",
    });
    expect(response.status).toBe(500);
    expect(mocks.recordCheckoutOutcome).toHaveBeenCalledWith("stripe", "technical_failure");
  });

  it("keeps operator controls behind admin authentication", async () => {
    expect((await request(makeApp()).get("/api/admin/billing-migration")).status).toBe(401);
    expect((await request(makeApp()).post("/api/admin/billing-migration").send({
      checkoutProvider: "whop",
      stripeRolloutPercent: 0,
      confirm: true,
    })).status).toBe(401);
  });

  it("shows provider ownership and migration counts to admins", async () => {
    const response = await request(makeApp())
      .get("/api/admin/billing-migration")
      .set("x-admin", "yes");
    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      stripePaid: 1,
      whopPaid: 1,
      migrationPending: 1,
      awaitingWhopCancellation: 1,
    });
    expect(response.body.operational).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded)$/),
      failuresLast24Hours: expect.any(Number),
      ignoredLast24Hours: expect.any(Number),
      recentFailures: expect.any(Array),
    });
  });

  it("requires explicit confirmation for a provider switch", async () => {
    const response = await request(makeApp())
      .post("/api/admin/billing-migration")
      .set("x-admin", "yes")
      .send({ checkoutProvider: "whop", stripeRolloutPercent: 0 });
    expect(response.status).toBe(400);
    expect(mocks.setBillingCutoverConfig).not.toHaveBeenCalled();
  });

  it("lets an authenticated admin explicitly resolve a persisted billing failure", async () => {
    const response = await request(makeApp())
      .post("/api/admin/billing-operations/42/resolve")
      .set("x-admin", "yes");
    expect(response.status).toBe(200);
    expect(mocks.resolveBillingOperationalFailure).toHaveBeenCalledWith(42);
  });
});