import { describe, expect, it } from "vitest";
import { LIVESWELL_STRIPE_PRICES, LIVESWELL_STRIPE_PRODUCT } from "./stripe-catalog";

describe("LiveSwell Stripe catalog", () => {
  it("defines stable monthly and annual Pro lookup keys at the published prices", () => {
    expect(LIVESWELL_STRIPE_PRODUCT.metadata.liveswell_product).toBe("pro");
    expect(LIVESWELL_STRIPE_PRICES).toEqual([
      expect.objectContaining({
        key: "monthly",
        lookupKey: "liveswell_pro_monthly_v1",
        unitAmount: 499,
        interval: "month",
      }),
      expect.objectContaining({
        key: "annual",
        lookupKey: "liveswell_pro_annual_v1",
        unitAmount: 2999,
        interval: "year",
      }),
    ]);
  });
});
