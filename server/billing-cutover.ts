import { storage } from "./storage";

export type CheckoutProvider = "stripe" | "whop";

const SETTING_KEY = "billing_checkout_provider";
const ROLLOUT_KEY = "billing_stripe_rollout_percent";
const DEFAULT_PROVIDER: CheckoutProvider = "stripe";
// A fresh environment must prove live Stripe readiness before accepting new
// subscriptions. Operators raise this explicitly after the launch preflight.
const DEFAULT_ROLLOUT_PERCENT = 0;
export const BILLING_EMERGENCY_OVERRIDE_ENV = "BILLING_EMERGENCY_CHECKOUT_PROVIDER";

export class BillingEmergencyOverrideError extends Error {
  constructor() {
    super(`${BILLING_EMERGENCY_OVERRIDE_ENV}=whop is active; only a matching Whop/0% database rollback can be saved.`);
  }
}

export function isWhopEmergencyOverrideActive(): boolean {
  return process.env[BILLING_EMERGENCY_OVERRIDE_ENV]?.trim().toLowerCase() === "whop";
}

export async function getBillingCutoverConfig(): Promise<{
  checkoutProvider: CheckoutProvider;
  stripeRolloutPercent: number;
  emergencyOverrideActive: boolean;
}> {
  if (isWhopEmergencyOverrideActive()) {
    return {
      checkoutProvider: "whop",
      stripeRolloutPercent: 0,
      emergencyOverrideActive: true,
    };
  }
  const [configured, rolloutValue] = await Promise.all([
    storage.getAdminSetting(SETTING_KEY),
    storage.getAdminSetting(ROLLOUT_KEY),
  ]);
  const checkoutProvider =
    configured === "stripe" || configured === "whop" ? configured : DEFAULT_PROVIDER;
  if (configured && configured !== "stripe" && configured !== "whop") {
    console.warn(`[billing/cutover] Ignoring invalid provider setting: ${configured}`);
  }
  const parsedRollout = Number(rolloutValue);
  const stripeRolloutPercent =
    rolloutValue !== null &&
    Number.isInteger(parsedRollout) &&
    parsedRollout >= 0 &&
    parsedRollout <= 100
      ? parsedRollout
      : DEFAULT_ROLLOUT_PERCENT;
  return { checkoutProvider, stripeRolloutPercent, emergencyOverrideActive: false };
}

function stableCohort(userId: string): number {
  let hash = 2166136261;
  for (const character of userId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export async function getCheckoutProvider(userId?: string): Promise<CheckoutProvider> {
  const config = await getBillingCutoverConfig();
  if (
    config.checkoutProvider === "whop" ||
    config.stripeRolloutPercent === 0
  ) {
    return "whop";
  }
  if (!userId || config.stripeRolloutPercent === 100) return "stripe";
  return stableCohort(userId) < config.stripeRolloutPercent ? "stripe" : "whop";
}

export async function setBillingCutoverConfig(
  provider: CheckoutProvider,
  stripeRolloutPercent: number,
): Promise<void> {
  if (
    isWhopEmergencyOverrideActive() &&
    (provider !== "whop" || stripeRolloutPercent !== 0)
  ) {
    throw new BillingEmergencyOverrideError();
  }
  await Promise.all([
    storage.setAdminSetting(SETTING_KEY, provider),
    storage.setAdminSetting(ROLLOUT_KEY, String(stripeRolloutPercent)),
  ]);
  console.warn(
    provider === "whop"
      ? "[billing/cutover] New checkout rolled back to Whop; existing Stripe subscriptions remain active."
      : `[billing/cutover] Stripe checkout enabled for ${stripeRolloutPercent}% of accounts; legacy Whop subscriptions remain active.`,
  );
}

export function getDefaultCheckoutProvider(): CheckoutProvider {
  return DEFAULT_PROVIDER;
}