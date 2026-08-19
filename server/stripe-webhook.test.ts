import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  constructStripeWebhookEvent: vi.fn(),
  findOrCreateManagedWebhook: vi.fn(),
  getStripeSync: vi.fn(),
  processStripeBillingEvent: vi.fn(),
  processWebhook: vi.fn(),
  runStripeMigrations: vi.fn(),
  syncBackfill: vi.fn(),
}));

vi.mock("stripe-replit-sync", () => ({
  runMigrations: mocks.runStripeMigrations,
}));

vi.mock("./stripe-client", () => ({
  constructStripeWebhookEvent: mocks.constructStripeWebhookEvent,
  getStripeSync: mocks.getStripeSync,
}));

vi.mock("./stripe-billing", () => ({
  processStripeBillingEvent: mocks.processStripeBillingEvent,
}));

import { initializeStripeSync, registerStripeWebhook } from "./stripe-webhook";

describe("initializeStripeSync", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://stripe-foundation-test");
    vi.stubEnv("REPLIT_DOMAINS", "app.example.test,secondary.example.test");
    mocks.findOrCreateManagedWebhook.mockResolvedValue({});
    mocks.constructStripeWebhookEvent.mockResolvedValue({ id: "evt_verified" });
    mocks.processStripeBillingEvent.mockResolvedValue(undefined);
    mocks.processWebhook.mockResolvedValue(undefined);
    mocks.syncBackfill.mockResolvedValue({});
    mocks.getStripeSync.mockResolvedValue({
      findOrCreateManagedWebhook: mocks.findOrCreateManagedWebhook,
      processWebhook: mocks.processWebhook,
      syncBackfill: mocks.syncBackfill,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("migrates, registers the managed webhook, and explicitly backfills all Stripe objects", async () => {
    await initializeStripeSync();

    expect(mocks.runStripeMigrations).toHaveBeenCalledWith({
      databaseUrl: "postgres://stripe-foundation-test",
      logger: console,
    });
    expect(mocks.findOrCreateManagedWebhook).toHaveBeenCalledWith(
      "https://app.example.test/api/stripe/webhook",
    );
    expect(mocks.syncBackfill).toHaveBeenCalledWith({ object: "all" });
  });
});

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    mocks.constructStripeWebhookEvent.mockResolvedValue({ id: "evt_verified" });
    mocks.processStripeBillingEvent.mockResolvedValue(undefined);
    mocks.processWebhook.mockResolvedValue(undefined);
    mocks.getStripeSync.mockResolvedValue({ processWebhook: mocks.processWebhook });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function buildApp() {
    const app = express();
    registerStripeWebhook(app);
    app.use(express.json());
    return app;
  }

  it("verifies the raw body, syncs the event, and then applies LiveSwell access", async () => {
    const response = await request(buildApp())
      .post("/api/stripe/webhook")
      .set("stripe-signature", "valid-signature")
      .set("content-type", "application/json")
      .send({ id: "evt_verified", type: "customer.subscription.updated" });

    expect(response.status).toBe(200);
    expect(Buffer.isBuffer(mocks.constructStripeWebhookEvent.mock.calls[0][0])).toBe(true);
    expect(mocks.constructStripeWebhookEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      "valid-signature",
    );
    expect(mocks.processWebhook).toHaveBeenCalledWith(
      expect.any(Buffer),
      "valid-signature",
    );
    expect(mocks.processStripeBillingEvent).toHaveBeenCalledWith({ id: "evt_verified" });
  });

  it("rejects an invalid signature before syncing or changing access", async () => {
    mocks.constructStripeWebhookEvent.mockRejectedValue(new Error("bad signature"));

    const response = await request(buildApp())
      .post("/api/stripe/webhook")
      .set("stripe-signature", "invalid-signature")
      .set("content-type", "application/json")
      .send({ id: "evt_untrusted" });

    expect(response.status).toBe(400);
    expect(mocks.processWebhook).not.toHaveBeenCalled();
    expect(mocks.processStripeBillingEvent).not.toHaveBeenCalled();
  });

  it("returns 500 for a verified event when access processing fails so Stripe retries it", async () => {
    mocks.processStripeBillingEvent.mockRejectedValue(new Error("database unavailable"));

    const response = await request(buildApp())
      .post("/api/stripe/webhook")
      .set("stripe-signature", "valid-signature")
      .set("content-type", "application/json")
      .send({ id: "evt_retry" });

    expect(response.status).toBe(500);
    expect(mocks.processWebhook).toHaveBeenCalled();
    expect(mocks.processStripeBillingEvent).toHaveBeenCalled();
  });
});