import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOrCreateManagedWebhook: vi.fn(),
  getStripeSync: vi.fn(),
  runStripeMigrations: vi.fn(),
  syncBackfill: vi.fn(),
}));

vi.mock("stripe-replit-sync", () => ({
  runMigrations: mocks.runStripeMigrations,
}));

vi.mock("./stripe-client", () => ({
  getStripeSync: mocks.getStripeSync,
}));

import { initializeStripeSync } from "./stripe-webhook";

describe("initializeStripeSync", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://stripe-foundation-test");
    vi.stubEnv("REPLIT_DOMAINS", "app.example.test,secondary.example.test");
    mocks.findOrCreateManagedWebhook.mockResolvedValue({});
    mocks.syncBackfill.mockResolvedValue({});
    mocks.getStripeSync.mockResolvedValue({
      findOrCreateManagedWebhook: mocks.findOrCreateManagedWebhook,
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