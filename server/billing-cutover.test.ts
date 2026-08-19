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

  it("defaults to the current Stripe checkout behavior", async () => {
    await expect(getBillingCutoverConfig()).resolves.toEqual({
      checkoutProvider: "stripe",
      stripeRolloutPercent: 100,
    });
    await expect(getCheckoutProvider("user_1")).resolves.toBe("stripe");
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
});