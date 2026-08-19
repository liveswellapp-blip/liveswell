import type Stripe from "stripe";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import {
  getStripePublishableKey,
  getUncachableStripeClient,
} from "./stripe-client";
import { getWhopClient } from "./whopClient";
import { LIVESWELL_STRIPE_PRICES } from "./stripe-catalog";
import { reconcileStripeSubscription, transitionProStatus } from "./pro-transitions";

export type BillingPlan = "monthly" | "annual";
export type AccessProvider = "stripe" | "whop" | "complimentary" | "test" | "free";

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing"]);
const TERMINAL_STRIPE_STATUSES = new Set(["canceled", "incomplete_expired"]);
const ACTIVE_WHOP_STATUSES = new Set(["active", "trialing", "canceling"]);
const PROVIDER_TIMEOUT_MS = 5_000;

type BillingUser = {
  id: string;
  email: string | null;
  isPro: boolean;
  paidPro: boolean;
  complimentaryPro: boolean;
  isTestAccount: boolean;
  whopMembershipId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingProvider: string | null;
};

export interface BillingStatus {
  isPro: boolean;
  provider: AccessProvider;
  plan: BillingPlan | null;
  renewsAt: number | null;
  canManageBilling: boolean;
  managementType: "stripe_portal" | "whop_hub" | null;
}

export class BillingRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function getAppOrigin(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  throw new BillingRequestError(
    503,
    "app_url_unavailable",
    "Application URL is not configured.",
  );
}

function getPlanDefinition(plan: BillingPlan) {
  const definition = LIVESWELL_STRIPE_PRICES.find((price) => price.key === plan);
  if (!definition) {
    throw new BillingRequestError(400, "invalid_plan", "Invalid subscription plan.");
  }
  return definition;
}

export function getStripePlanFromSubscription(
  subscription: Stripe.Subscription,
): BillingPlan | null {
  const lookupKey = subscription.items.data[0]?.price.lookup_key;
  return LIVESWELL_STRIPE_PRICES.find((definition) => definition.lookupKey === lookupKey)?.key ?? null;
}

export function isStripeSubscriptionActive(status: string): boolean {
  return ACTIVE_STRIPE_STATUSES.has(status);
}

export async function resolveStripePrice(
  stripe: Stripe,
  plan: BillingPlan,
): Promise<Stripe.Price> {
  const definition = getPlanDefinition(plan);
  const prices = await stripe.prices.list({
    lookup_keys: [definition.lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  let productId: string | null = null;
  if (price) {
    const productReference = price.product;
    productId =
      typeof productReference === "string" ? productReference : productReference.id;
  }
  const product = productId ? await stripe.products.retrieve(productId) : null;

  const valid =
    price &&
    product &&
    !product.deleted &&
    price.lookup_key === definition.lookupKey &&
    price.unit_amount === definition.unitAmount &&
    price.currency === definition.currency &&
    price.recurring?.interval === definition.interval &&
    price.metadata.liveswell_app === "liveswell" &&
    price.metadata.catalog_version === "v1" &&
    price.metadata.liveswell_plan === definition.metadata.liveswell_plan &&
    product.metadata.liveswell_product === "pro" &&
    product.metadata.liveswell_app === "liveswell" &&
    product.metadata.catalog_version === "v1";

  if (!valid) {
    throw new BillingRequestError(
      503,
      "stripe_catalog_unavailable",
      `The ${plan} Stripe price is not configured correctly.`,
    );
  }
  return price;
}

async function loadBillingUser(userId: string): Promise<BillingUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      isPro: users.isPro,
      paidPro: users.paidPro,
      complimentaryPro: users.complimentaryPro,
      isTestAccount: users.isTestAccount,
      whopMembershipId: users.whopMembershipId,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      billingProvider: users.billingProvider,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

async function ensureStripeCustomer(stripe: Stripe, user: BillingUser): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create(
    {
      email: user.email ?? undefined,
      metadata: {
        clerk_user_id: user.id,
        liveswell_app: "liveswell",
      },
    },
    { idempotencyKey: `liveswell-customer-${user.id}` },
  );

  const updated = await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.stripeCustomerId)))
    .returning({ stripeCustomerId: users.stripeCustomerId });

  if (updated[0]?.stripeCustomerId) return updated[0].stripeCustomerId;

  // A concurrent request won the local update. Reuse its customer reference;
  // Stripe's idempotency key ensures both requests received the same customer.
  const current = await loadBillingUser(user.id);
  if (!current?.stripeCustomerId) {
    throw new BillingRequestError(
      500,
      "customer_link_failed",
      "Could not link the Stripe customer to this account.",
    );
  }
  return current.stripeCustomerId;
}

export async function createStripeSubscriptionSession(
  userId: string,
  plan: BillingPlan,
): Promise<{
  checkoutSessionId: string;
  clientSecret: string;
  publishableKey: string;
}> {
  const user = await loadBillingUser(userId);
  if (!user) {
    throw new BillingRequestError(404, "user_not_found", "User account was not found.");
  }
  if (user.isPro) {
    throw new BillingRequestError(
      409,
      "already_subscribed",
      "You already have active Pro access.",
    );
  }

  const [stripe, publishableKey] = await Promise.all([
    getUncachableStripeClient(),
    getStripePublishableKey(),
  ]);

  if (user.stripeSubscriptionId) {
    try {
      const existingSubscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
      if (!TERMINAL_STRIPE_STATUSES.has(existingSubscription.status)) {
        throw new BillingRequestError(
          409,
          "subscription_exists",
          "A Stripe subscription already exists for this account.",
        );
      }
    } catch (error) {
      if (error instanceof BillingRequestError) throw error;
      console.warn("[stripe/checkout] Could not verify the existing subscription:", error);
      throw new BillingRequestError(
        502,
        "stripe_subscription_unavailable",
        "Could not verify the existing Stripe subscription.",
      );
    }
  }

  const price = await resolveStripePrice(stripe, plan);
  const customerId = await ensureStripeCustomer(stripe, user);

  try {
    const customerSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    const hasExistingSubscription = customerSubscriptions.data.some(
      (subscription) => !TERMINAL_STRIPE_STATUSES.has(subscription.status),
    );
    if (hasExistingSubscription) {
      throw new BillingRequestError(
        409,
        "subscription_exists",
        "A Stripe subscription already exists for this account.",
      );
    }
  } catch (error) {
    if (error instanceof BillingRequestError) throw error;
    console.warn("[stripe/checkout] Could not verify customer subscriptions:", error);
    throw new BillingRequestError(
      502,
      "stripe_subscription_unavailable",
      "Could not verify existing Stripe subscriptions.",
    );
  }

  const openSessions = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 1,
  });
  if (openSessions.data.length > 0) {
    throw new BillingRequestError(
      409,
      "checkout_in_progress",
      "A subscription checkout is already in progress.",
    );
  }

  const metadata = {
    clerk_user_id: user.id,
    liveswell_app: "liveswell",
    liveswell_plan: plan,
  };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      ui_mode: "embedded",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      return_url: `${getAppOrigin()}/pricing?stripe_session_id={CHECKOUT_SESSION_ID}`,
      metadata,
      subscription_data: { metadata },
    },
    // The same user cannot create two subscriptions concurrently. Sequential
    // attempts are also caught by the open-session lookup above.
    { idempotencyKey: `liveswell-subscription-checkout-${user.id}` },
  );

  if (!session.client_secret) {
    throw new BillingRequestError(
      502,
      "checkout_session_incomplete",
      "Stripe did not return a checkout client secret.",
    );
  }

  return {
    checkoutSessionId: session.id,
    clientSecret: session.client_secret,
    publishableKey,
  };
}

export async function createStripeBillingPortalSession(
  userId: string,
): Promise<{ url: string }> {
  const user = await loadBillingUser(userId);
  if (!user?.stripeCustomerId || user.billingProvider !== "stripe") {
    throw new BillingRequestError(
      400,
      "stripe_billing_unavailable",
      "This account does not have Stripe-managed billing.",
    );
  }

  const stripe = await getUncachableStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppOrigin()}/account`,
  });
  return { url: session.url };
}

function providerFromUser(user: BillingUser): AccessProvider {
  if (user.billingProvider === "stripe") return "stripe";
  if (user.billingProvider === "whop") return "whop";
  if (user.isTestAccount && user.isPro) return "test";
  if (user.isPro) return "complimentary";
  return "free";
}

function cachedBillingStatus(user: BillingUser): BillingStatus {
  const provider = providerFromUser(user);
  return {
    isPro: user.isPro,
    provider,
    plan: null,
    renewsAt: null,
    canManageBilling: provider === "stripe" || provider === "whop",
    managementType:
      provider === "stripe"
        ? "stripe_portal"
        : provider === "whop"
          ? "whop_hub"
          : null,
  };
}

async function withProviderTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Billing provider timeout")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await loadBillingUser(userId);
  if (!user) {
    return {
      isPro: false,
      provider: "free",
      plan: null,
      renewsAt: null,
      canManageBilling: false,
      managementType: null,
    };
  }

  const cached = cachedBillingStatus(user);

  if (user.billingProvider === "stripe" && user.stripeSubscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const subscription = await withProviderTimeout(
        stripe.subscriptions.retrieve(user.stripeSubscriptionId),
      );
      const active = isStripeSubscriptionActive(subscription.status);
      let effectiveSubscription = subscription;
      await reconcileStripeSubscription({
        userId,
        customerId:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        active,
        refreshAfterLock: async () => {
          const latest = await stripe.subscriptions.retrieve(user.stripeSubscriptionId!);
          effectiveSubscription = latest;
          return {
            customerId:
              typeof latest.customer === "string"
                ? latest.customer
                : latest.customer.id,
            subscriptionId: latest.id,
            status: latest.status,
            active: isStripeSubscriptionActive(latest.status),
          };
        },
      });
      const effectiveActive = isStripeSubscriptionActive(effectiveSubscription.status);
      const currentPeriodEnd = (effectiveSubscription as Stripe.Subscription & {
        current_period_end?: number;
      }).current_period_end;
      return {
        isPro: effectiveActive || user.complimentaryPro || user.isTestAccount,
        provider: "stripe",
        plan: getStripePlanFromSubscription(effectiveSubscription),
        renewsAt: currentPeriodEnd ?? null,
        canManageBilling: true,
        managementType: "stripe_portal",
      };
    } catch (error) {
      console.warn("[billing/status] Stripe unavailable; using cached access:", error);
      return cached;
    }
  }

  if (user.billingProvider === "whop" && user.whopMembershipId) {
    try {
      const membership = await withProviderTimeout(
        getWhopClient().then((client) => client.memberships.retrieve(user.whopMembershipId!)),
      );
      const active = ACTIVE_WHOP_STATUSES.has(membership.status);
      if (active !== user.paidPro) {
        await transitionProStatus(userId, active, "whop", {
          extraPayload: {
            via: "unified_subscription_reconciliation",
            membershipId: user.whopMembershipId,
          },
          expectedWhopMembershipId: user.whopMembershipId,
        });
      }
      const planId = (membership as { plan?: { id?: string } }).plan?.id;
      const plan =
        planId === process.env.WHOP_MONTHLY_PLAN_ID
          ? "monthly"
          : planId === process.env.WHOP_ANNUAL_PLAN_ID
            ? "annual"
            : null;
      return {
        isPro: active || user.complimentaryPro || user.isTestAccount,
        provider: "whop",
        plan,
        renewsAt:
          (membership as unknown as { renewal_period_end?: number }).renewal_period_end ?? null,
        canManageBilling: true,
        managementType: "whop_hub",
      };
    } catch (error) {
      console.warn("[billing/status] Whop unavailable; using cached access:", error);
      return cached;
    }
  }

  return cached;
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  if (typeof legacySubscription === "string") return legacySubscription;
  if (legacySubscription?.id) return legacySubscription.id;

  const parentSubscription = (
    invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { subscription?: string | Stripe.Subscription } };
    }
  ).parent?.subscription_details?.subscription;
  return typeof parentSubscription === "string"
    ? parentSubscription
    : parentSubscription?.id ?? null;
}

async function findUserIdForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = subscription.metadata.clerk_user_id;
  if (metadataUserId) return metadataUserId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.stripeSubscriptionId, subscription.id),
        eq(users.stripeCustomerId, customerId),
      ),
    )
    .limit(1);
  return user?.id ?? null;
}

async function reconcileVerifiedSubscription(
  subscription: Stripe.Subscription,
  eventId: string,
  fallbackUserId?: string,
  stripe?: Stripe,
): Promise<void> {
  const plan = getStripePlanFromSubscription(subscription);
  if (!plan) {
    console.warn(`[stripe/webhook] Ignoring subscription ${subscription.id} with an unknown price.`);
    return;
  }

  const userId = fallbackUserId ?? await findUserIdForSubscription(subscription);
  if (!userId) {
    console.warn(`[stripe/webhook] No LiveSwell user found for subscription ${subscription.id}.`);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const result = await reconcileStripeSubscription({
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    active: isStripeSubscriptionActive(subscription.status),
    eventId,
    refreshAfterLock: stripe
      ? async () => {
          const latest = await stripe.subscriptions.retrieve(subscription.id);
          return {
            customerId:
              typeof latest.customer === "string"
                ? latest.customer
                : latest.customer.id,
            subscriptionId: latest.id,
            status: latest.status,
            active: isStripeSubscriptionActive(latest.status),
          };
        }
      : undefined,
  });
  console.log(
    `[stripe/webhook] ${subscription.id} (${subscription.status}) reconciled: changed=${result.changed}, ignored=${result.ignored}`,
  );
}

/**
 * Applies a signature-verified event to LiveSwell access. stripe-replit-sync
 * persists the raw Stripe model separately before this function is called.
 */
export async function processStripeBillingEvent(event: Stripe.Event): Promise<void> {
  if (event.type.startsWith("customer.subscription.")) {
    const eventSubscription = event.data.object as Stripe.Subscription;
    const stripe = await getUncachableStripeClient();
    // Always reconcile the provider's current object, not the possibly stale
    // event snapshot. This makes same-subscription event reordering harmless.
    const currentSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
    await reconcileVerifiedSubscription(
      currentSubscription,
      event.id,
      eventSubscription.metadata.clerk_user_id || undefined,
      stripe,
    );
    return;
  }

  const stripe = await getUncachableStripeClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await reconcileVerifiedSubscription(
        subscription,
        event.id,
        session.metadata?.clerk_user_id ?? session.client_reference_id ?? undefined,
        stripe,
      );
    }
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscriptionId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice);
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await reconcileVerifiedSubscription(subscription, event.id, undefined, stripe);
    }
  }
}