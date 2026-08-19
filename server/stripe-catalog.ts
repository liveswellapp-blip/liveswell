/**
 * The canonical LiveSwell Stripe catalog.
 *
 * Keep price IDs out of source code: Stripe lookup keys are stable identifiers
 * that the subscription backend can resolve server-side in a later task.
 */
export const LIVESWELL_STRIPE_PRODUCT = {
  name: "LiveSwell Pro",
  description: "Premium surf alerts, AI surf chat, and daily summaries.",
  metadata: {
    liveswell_product: "pro",
    liveswell_app: "liveswell",
    catalog_version: "v1",
  },
} as const;

export const LIVESWELL_STRIPE_PRICES = [
  {
    key: "monthly",
    lookupKey: "liveswell_pro_monthly_v1",
    unitAmount: 499,
    currency: "usd",
    interval: "month",
    metadata: {
      liveswell_plan: "pro_monthly",
      liveswell_app: "liveswell",
      catalog_version: "v1",
    },
  },
  {
    key: "annual",
    lookupKey: "liveswell_pro_annual_v1",
    unitAmount: 2999,
    currency: "usd",
    interval: "year",
    metadata: {
      liveswell_plan: "pro_annual",
      liveswell_app: "liveswell",
      catalog_version: "v1",
    },
  },
] as const;
