import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSetting: vi.fn(),
  setAdminSetting: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: {
    getAdminSetting: mocks.getAdminSetting,
    setAdminSetting: mocks.setAdminSetting,
  },
}));

import {
  getBillingCutoverConfig,
  getCheckoutProvider,
  setBillingCutoverConfig,
} from "./billing-cutover";

describe("billing checkout cutover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSetting.mockResolvedValue(null);
    mocks.setAdminSetting.mockResolvedValue(undefined);
  });

  it("defaults to a paused Stripe cohort until launch verification is complete", async () => {
    await expect(getBillingCutoverConfig()).resolves.toEqual({
      checkoutProvider: "stripe",
      stripeRolloutPercent: 0,
      emergencyOverrideActive: false,
    });
    await expect(getCheckoutProvider("user_1")).resolves.toBe("whop");
  });

  it("assigns partial Stripe rollout cohorts stably", async () => {
    mocks.getAdminSetting.mockImplementation(async (key: string) =>
      key === "billing_checkout_provider" ? "stripe" : "25",
    );
    const first = await getCheckoutProvider("stable_user");
    const second = await getCheckoutProvider("stable_user");
    expect(second).toBe(first);
    expect(["stripe", "whop"]).toContain(first);
  });

  it("rolls all new checkout back to Whop without changing subscriptions", async () => {
    mocks.getAdminSetting.mockImplementation(async (key: string) =>
      key === "billing_checkout_provider" ? "whop" : "100",
    );
    await expect(getCheckoutProvider("user_1")).resolves.toBe("whop");
  });

  it("persists provider and cohort together", async () => {
    await setBillingCutoverConfig("stripe", 10);
    expect(mocks.setAdminSetting).toHaveBeenCalledWith("billing_checkout_provider", "stripe");
    expect(mocks.setAdminSetting).toHaveBeenCalledWith("billing_stripe_rollout_percent", "10");
  });

  it("uses an environment-level Whop override before reading database settings", async () => {
    process.env.BILLING_EMERGENCY_CHECKOUT_PROVIDER = "whop";
    try {
      await expect(getBillingCutoverConfig()).resolves.toEqual({
        checkoutProvider: "whop",
        stripeRolloutPercent: 0,
        emergencyOverrideActive: true,
      });
      await expect(getCheckoutProvider("user_1")).resolves.toBe("whop");
      expect(mocks.getAdminSetting).not.toHaveBeenCalled();
    } finally {
      delete process.env.BILLING_EMERGENCY_CHECKOUT_PROVIDER;
    }
  });

  it("allows persisting the safe Whop rollback while the environment override is active", async () => {
    process.env.BILLING_EMERGENCY_CHECKOUT_PROVIDER = "whop";
    try {
      await expect(setBillingCutoverConfig("whop", 0)).resolves.toBeUndefined();
      await expect(setBillingCutoverConfig("stripe", 5)).rejects.toThrow(
        /BILLING_EMERGENCY_CHECKOUT_PROVIDER/,
      );
      expect(mocks.setAdminSetting).toHaveBeenCalledWith("billing_checkout_provider", "whop");
      expect(mocks.setAdminSetting).toHaveBeenCalledWith("billing_stripe_rollout_percent", "0");
    } finally {
      delete process.env.BILLING_EMERGENCY_CHECKOUT_PROVIDER;
    }
  });
});