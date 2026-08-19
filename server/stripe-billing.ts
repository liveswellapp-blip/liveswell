import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import {
  getStripePublishableKey,
  getUncachableStripeClient,
} from "./stripe-client";
import { getWhopClient } from "./whopClient";
import { LIVESWELL_STRIPE_PRICES } from "./stripe-catalog";
import {
  beginWhopToStripeMigration,
  reconcileStripeSubscription,
  transitionProStatus,
} from "./pro-transitions";
import { safeLogger } from "./safe-logging";

export type BillingPlan = "monthly" | "annual";
export type AccessProvider = "stripe" | "whop" | "complimentary" | "test" | "free";
export type StripeAccessState = "active" | "grace" | "canceled" | "incomplete" | "unpaid" | "unknown";

export type BillingPaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  createdAt: number;
  amountPaid: number;
  currency: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
};

// Stripe keeps retrying a failed renewal while a subscription is past_due.
// LiveSwell treats that provider-controlled retry window as a grace period.
const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);
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
  billingMigrationState: string | null;
  billingMigrationStartedAt: Date | null;
  billingMigrationIntentId: string | null;
  billingMigrationIntentExpiresAt: Date | null;
};

export interface BillingStatus {
  isPro: boolean;
  provider: AccessProvider;
  plan: BillingPlan | null;
  renewsAt: number | null;
  periodEndsAt: number | null;
  subscriptionStatus: Stripe.Subscription.Status | null;
  accessState: StripeAccessState;
  cancelAtPeriodEnd: boolean;
  paymentMethod: BillingPaymentMethod | null;
  invoices: BillingInvoice[];
  providerState: "live" | "cached" | "not_applicable";
  canManageBilling: boolean;
  managementType: "stripe_in_app" | "whop_hub" | null;
  migration: {
    state: "not_applicable" | "available" | "pending" | "awaiting_whop_cancellation" | "completed";
    from: "whop" | null;
    canStart: boolean;
  };
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
  const deploymentDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (deploymentDomain) return `https://${deploymentDomain}`;
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

function isProviderNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number; statusCode?: number; code?: string };
  return candidate.status === 404 ||
    candidate.statusCode === 404 ||
    candidate.code === "not_found";
}

async function verifyCanonicalWhopMembershipActive(membershipId: string): Promise<boolean> {
  const allowedPlanIds = new Set(
    [process.env.WHOP_MONTHLY_PLAN_ID, process.env.WHOP_ANNUAL_PLAN_ID].filter(
      (planId): planId is string => Boolean(planId),
    ),
  );
  if (allowedPlanIds.size === 0) {
    throw new Error("Cannot verify Whop fallback without configured plan IDs.");
  }
  try {
    const membership = await getWhopClient().then((client) =>
      client.memberships.retrieve(membershipId),
    );
    const planId = (membership as { plan?: { id?: string } }).plan?.id;
    return ACTIVE_WHOP_STATUSES.has(membership.status) &&
      Boolean(planId) &&
      allowedPlanIds.has(planId!);
  } catch (error) {
    if (isProviderNotFound(error)) return false;
    throw error;
  }
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
      billingMigrationState: users.billingMigrationState,
      billingMigrationStartedAt: users.billingMigrationStartedAt,
      billingMigrationIntentId: users.billingMigrationIntentId,
      billingMigrationIntentExpiresAt: users.billingMigrationIntentExpiresAt,
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
  options: { confirmWhopMigration?: boolean } = {},
): Promise<{
  checkoutSessionId: string;
  clientSecret: string;
  publishableKey: string;
}> {
  const user = await loadBillingUser(userId);
  if (!user) {
    throw new BillingRequestError(404, "user_not_found", "User account was not found.");
  }
  const isWhopMigration =
    user.paidPro &&
    user.billingProvider === "whop" &&
    Boolean(user.whopMembershipId);
  if (user.isPro && !isWhopMigration) {
    throw new BillingRequestError(
      409,
      "already_subscribed",
      "You already have active Pro access.",
    );
  }
  if (isWhopMigration && !options.confirmWhopMigration) {
    throw new BillingRequestError(
      409,
      "whop_migration_confirmation_required",
      "Confirm that Stripe will start a separate subscription and that Whop must be canceled separately.",
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
      safeLogger.warn("[stripe/checkout] Could not verify the existing subscription", { error });
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
    safeLogger.warn("[stripe/checkout] Could not verify customer subscriptions", { error });
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

  let migrationIntentId: string | undefined;
  if (isWhopMigration) {
    try {
      migrationIntentId = await beginWhopToStripeMigration(
        user.id,
        user.whopMembershipId!,
        randomUUID(),
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      );
    } catch {
      throw new BillingRequestError(
        409,
        "whop_migration_no_longer_eligible",
        "The Whop subscription changed before migration started. Refresh billing and try again.",
      );
    }
  }

  const metadata = {
    clerk_user_id: user.id,
    liveswell_app: "liveswell",
    liveswell_plan: plan,
    ...(isWhopMigration
      ? { migration_from: "whop", migration_intent_id: migrationIntentId! }
      : {}),
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
    {
      idempotencyKey: migrationIntentId
        ? `liveswell-subscription-checkout-${user.id}-${migrationIntentId}`
        : `liveswell-subscription-checkout-${user.id}`,
    },
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

async function getOwnedStripeSubscription(
  userId: string,
  stripe: Stripe,
): Promise<{ user: BillingUser; subscription: Stripe.Subscription }> {
  const user = await loadBillingUser(userId);
  if (
    !user ||
    user.billingProvider !== "stripe" ||
    !user.stripeCustomerId ||
    !user.stripeSubscriptionId
  ) {
    throw new BillingRequestError(
      400,
      "stripe_billing_unavailable",
      "This account does not have an active Stripe-managed subscription.",
    );
  }
  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
    expand: ["default_payment_method"],
  });
  if (stripeCustomerId(subscription.customer) !== user.stripeCustomerId) {
    throw new BillingRequestError(
      403,
      "billing_ownership_mismatch",
      "This Stripe subscription is not linked to your account.",
    );
  }
  return { user, subscription };
}

function mutationKey(userId: string, action: string, requestId: string): string {
  return `liveswell-${action}-${userId}-${requestId}`;
}

export async function setStripeCancellation(
  userId: string,
  cancelAtPeriodEnd: boolean,
  requestId: string,
): Promise<void> {
  const stripe = await getUncachableStripeClient();
  const { subscription } = await getOwnedStripeSubscription(userId, stripe);
  if (TERMINAL_STRIPE_STATUSES.has(subscription.status) || subscription.status === "unpaid") {
    throw new BillingRequestError(409, "subscription_not_manageable", "This subscription can no longer be changed.");
  }
  await stripe.subscriptions.update(
    subscription.id,
    { cancel_at_period_end: cancelAtPeriodEnd },
    { idempotencyKey: mutationKey(userId, cancelAtPeriodEnd ? "cancel" : "resume", requestId) },
  );
}

export async function changeStripePlan(
  userId: string,
  plan: BillingPlan,
  requestId: string,
): Promise<void> {
  const stripe = await getUncachableStripeClient();
  const { subscription } = await getOwnedStripeSubscription(userId, stripe);
  if (TERMINAL_STRIPE_STATUSES.has(subscription.status) || subscription.status === "unpaid") {
    throw new BillingRequestError(409, "subscription_not_manageable", "This subscription can no longer be changed.");
  }
  const currentItem = subscription.items.data[0];
  if (!currentItem) {
    throw new BillingRequestError(409, "subscription_item_missing", "This subscription has no billable plan item.");
  }
  const price = await resolveStripePrice(stripe, plan);
  if (currentItem.price.id === price.id) {
    throw new BillingRequestError(409, "already_on_plan", "This is already your current plan.");
  }
  await stripe.subscriptions.update(
    subscription.id,
    {
      items: [{ id: currentItem.id, price: price.id }],
      proration_behavior: "create_prorations",
      metadata: {
        clerk_user_id: userId,
        liveswell_app: "liveswell",
        liveswell_plan: plan,
      },
    },
    { idempotencyKey: mutationKey(userId, `plan-${plan}`, requestId) },
  );
}

export async function createStripePaymentMethodSetup(
  userId: string,
  requestId: string,
): Promise<{ clientSecret: string; publishableKey: string }> {
  const stripe = await getUncachableStripeClient();
  const { user, subscription } = await getOwnedStripeSubscription(userId, stripe);
  if (TERMINAL_STRIPE_STATUSES.has(subscription.status) || subscription.status === "unpaid") {
    throw new BillingRequestError(409, "subscription_not_manageable", "This subscription can no longer be changed.");
  }
  const [setupIntent, publishableKey] = await Promise.all([
    stripe.setupIntents.create(
      {
        customer: user.stripeCustomerId!,
        usage: "off_session",
        payment_method_types: ["card"],
        metadata: {
          clerk_user_id: userId,
          liveswell_app: "liveswell",
          stripe_subscription_id: subscription.id,
        },
      },
      { idempotencyKey: mutationKey(userId, "payment-setup", requestId) },
    ),
    getStripePublishableKey(),
  ]);
  if (!setupIntent.client_secret) {
    throw new BillingRequestError(502, "setup_intent_incomplete", "Stripe did not prepare a payment update form.");
  }
  return { clientSecret: setupIntent.client_secret, publishableKey };
}

export async function completeStripePaymentMethodSetup(
  userId: string,
  setupIntentId: string,
): Promise<void> {
  const stripe = await getUncachableStripeClient();
  const { user, subscription } = await getOwnedStripeSubscription(userId, stripe);
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const setupCustomer = setupIntent.customer;
  if (
    setupIntent.status !== "succeeded" ||
    !setupCustomer ||
    stripeCustomerId(setupCustomer) !== user.stripeCustomerId
  ) {
    throw new BillingRequestError(403, "payment_setup_unverified", "This payment update could not be verified for your account.");
  }
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  if (!paymentMethodId) {
    throw new BillingRequestError(409, "payment_method_missing", "Stripe did not attach a payment method.");
  }
  await Promise.all([
    stripe.customers.update(
      user.stripeCustomerId!,
      { invoice_settings: { default_payment_method: paymentMethodId } },
      { idempotencyKey: `liveswell-payment-customer-${setupIntent.id}` },
    ),
    stripe.subscriptions.update(
      subscription.id,
      { default_payment_method: paymentMethodId },
      { idempotencyKey: `liveswell-payment-subscription-${setupIntent.id}` },
    ),
  ]);
}

export async function getStripeInvoiceDocument(
  userId: string,
  invoiceId: string,
): Promise<{ url: string }> {
  const user = await loadBillingUser(userId);
  if (!user?.stripeCustomerId || user.billingProvider !== "stripe") {
    throw new BillingRequestError(400, "stripe_billing_unavailable", "This account does not have Stripe billing documents.");
  }
  const stripe = await getUncachableStripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (!invoice.customer || stripeCustomerId(invoice.customer) !== user.stripeCustomerId) {
    // Return 404 to avoid confirming another customer's invoice ID.
    throw new BillingRequestError(404, "invoice_not_found", "Invoice not found.");
  }
  const url = invoice.invoice_pdf ?? invoice.hosted_invoice_url;
  if (!url || !url.startsWith("https://")) {
    throw new BillingRequestError(404, "invoice_document_unavailable", "This invoice has no downloadable document.");
  }
  return { url };
}

function providerFromUser(user: BillingUser): AccessProvider {
  if (user.billingProvider === "stripe" && user.paidPro) return "stripe";
  if (user.billingProvider === "whop" && user.paidPro) return "whop";
  if (user.isTestAccount && user.isPro) return "test";
  if (user.complimentaryPro && user.isPro) return "complimentary";
  return "free";
}

function migrationForUser(
  user: BillingUser,
  whopActive = user.billingProvider === "whop" && user.paidPro,
): BillingStatus["migration"] {
  if (user.billingMigrationState === "awaiting_whop_cancellation") {
    return { state: "awaiting_whop_cancellation", from: "whop", canStart: false };
  }
  if (user.billingMigrationState === "whop_to_stripe_completed") {
    return { state: "completed", from: "whop", canStart: false };
  }
  if (user.billingMigrationState === "whop_to_stripe_pending") {
    return { state: "pending", from: "whop", canStart: whopActive };
  }
  if (whopActive) {
    return { state: "available", from: "whop", canStart: true };
  }
  return { state: "not_applicable", from: null, canStart: false };
}

function cachedBillingStatus(user: BillingUser): BillingStatus {
  const provider = providerFromUser(user);
  return {
    isPro: user.isPro,
    provider,
    plan: null,
    renewsAt: null,
    periodEndsAt: null,
    subscriptionStatus: null,
    accessState: "unknown",
    cancelAtPeriodEnd: false,
    paymentMethod: null,
    invoices: [],
    providerState: provider === "stripe" || provider === "whop" ? "cached" : "not_applicable",
    canManageBilling: provider === "stripe" || provider === "whop",
    managementType:
      provider === "stripe"
        ? "stripe_in_app"
        : provider === "whop"
          ? "whop_hub"
          : null,
    migration: migrationForUser(user),
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

function stripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof customer === "string" ? customer : customer.id;
}

function currentPeriodEnd(subscription: Stripe.Subscription): number | null {
  return (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? null;
}

function accessStateForSubscription(status: Stripe.Subscription.Status): StripeAccessState {
  if (status === "past_due") return "grace";
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled") return "canceled";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  if (status === "unpaid") return "unpaid";
  return "unknown";
}

function summarizePaymentMethod(
  paymentMethod: string | Stripe.PaymentMethod | null | undefined,
): BillingPaymentMethod | null {
  if (!paymentMethod || typeof paymentMethod === "string" || paymentMethod.type !== "card" || !paymentMethod.card) {
    return null;
  }
  return {
    brand: paymentMethod.card.brand,
    last4: paymentMethod.card.last4,
    expMonth: paymentMethod.card.exp_month ?? null,
    expYear: paymentMethod.card.exp_year ?? null,
  };
}

function summarizeInvoice(invoice: Stripe.Invoice): BillingInvoice {
  return {
    id: invoice.id ?? "",
    number: invoice.number ?? null,
    status: invoice.status ?? null,
    createdAt: invoice.created,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency ?? "usd",
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
  };
}

async function getSubscriptionPaymentMethod(
  stripe: Stripe,
  customerId: string,
  subscription: Stripe.Subscription,
): Promise<BillingPaymentMethod | null> {
  const direct = summarizePaymentMethod(
    (subscription as Stripe.Subscription & {
      default_payment_method?: string | Stripe.PaymentMethod | null;
    }).default_payment_method,
  );
  if (direct) return direct;

  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) return null;
  return summarizePaymentMethod(customer.invoice_settings.default_payment_method);
}

async function listSubscriptionInvoices(
  stripe: Stripe,
  customerId: string,
): Promise<BillingInvoice[]> {
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 12 });
  return invoices.data.map(summarizeInvoice);
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await loadBillingUser(userId);
  if (!user) {
    return {
      isPro: false,
      provider: "free",
      plan: null,
      renewsAt: null,
      periodEndsAt: null,
      subscriptionStatus: null,
      accessState: "unknown",
      cancelAtPeriodEnd: false,
      paymentMethod: null,
      invoices: [],
      providerState: "not_applicable",
      canManageBilling: false,
      managementType: null,
      migration: { state: "not_applicable", from: null, canStart: false },
    };
  }

  const cached = cachedBillingStatus(user);

  if (user.billingProvider === "stripe" && user.stripeSubscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const subscription = await withProviderTimeout(
        stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ["default_payment_method"],
        }),
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
        migrationIntentId: subscription.metadata?.migration_intent_id,
        subscriptionCreatedAt: subscription.created,
        verifyWhopActiveAfterLock: verifyCanonicalWhopMembershipActive,
        refreshAfterLock: async () => {
          const latest = await stripe.subscriptions.retrieve(user.stripeSubscriptionId!, {
            expand: ["default_payment_method"],
          });
          effectiveSubscription = latest;
          return {
            customerId:
              typeof latest.customer === "string"
                ? latest.customer
                : latest.customer.id,
            subscriptionId: latest.id,
            status: latest.status,
            active: isStripeSubscriptionActive(latest.status),
            migrationIntentId: latest.metadata?.migration_intent_id,
            subscriptionCreatedAt: latest.created,
          };
        },
      });
      const effectiveActive = isStripeSubscriptionActive(effectiveSubscription.status);
      if (
        !effectiveActive &&
        user.billingMigrationState === "awaiting_whop_cancellation" &&
        user.whopMembershipId
      ) {
        const refreshedUser = await loadBillingUser(userId);
        if (refreshedUser?.billingProvider === "whop") {
          return getBillingStatus(userId);
        }
      }
      const customerId = stripeCustomerId(effectiveSubscription.customer);
      const [paymentMethod, invoices] = await Promise.all([
        getSubscriptionPaymentMethod(stripe, customerId, effectiveSubscription),
        listSubscriptionInvoices(stripe, customerId),
      ]);
      const accessProvider: AccessProvider = effectiveActive
        ? "stripe"
        : user.isTestAccount && user.isPro
          ? "test"
          : user.complimentaryPro && user.isPro
            ? "complimentary"
            : "stripe";
      const periodEndsAt = currentPeriodEnd(effectiveSubscription);
      return {
        isPro: effectiveActive || user.complimentaryPro || user.isTestAccount,
        provider: accessProvider,
        plan: getStripePlanFromSubscription(effectiveSubscription),
        renewsAt: periodEndsAt,
        periodEndsAt,
        subscriptionStatus: effectiveSubscription.status,
        accessState: accessStateForSubscription(effectiveSubscription.status),
        cancelAtPeriodEnd: effectiveSubscription.cancel_at_period_end,
        paymentMethod,
        invoices,
        providerState: "live",
        canManageBilling:
          accessProvider === "stripe" &&
          !TERMINAL_STRIPE_STATUSES.has(effectiveSubscription.status) &&
          effectiveSubscription.status !== "unpaid",
        managementType: accessProvider === "stripe" ? "stripe_in_app" : null,
        migration: migrationForUser(user),
      };
    } catch (error) {
      safeLogger.warn("[billing/status] Stripe unavailable; using cached access", { error });
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
      const accessProvider: AccessProvider = active
        ? "whop"
        : user.isTestAccount
          ? "test"
          : user.complimentaryPro
            ? "complimentary"
            : "free";
      return {
        isPro: active || user.complimentaryPro || user.isTestAccount,
        provider: accessProvider,
        plan,
        renewsAt:
          (membership as unknown as { renewal_period_end?: number }).renewal_period_end ?? null,
        periodEndsAt:
          (membership as unknown as { renewal_period_end?: number }).renewal_period_end ?? null,
        subscriptionStatus: null,
        accessState: active ? "active" : "unknown",
        cancelAtPeriodEnd: membership.status === "canceling",
        paymentMethod: null,
        invoices: [],
        providerState: "live",
        canManageBilling: active,
        managementType: active ? "whop_hub" : null,
        migration: migrationForUser(user, active),
      };
    } catch (error) {
      safeLogger.warn("[billing/status] Whop unavailable; using cached access", { error });
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

export type StripeBillingEventResult = {
  status: "success" | "failure" | "ignored";
  code: string;
  userId?: string;
  objectId?: string;
};

async function reconcileVerifiedSubscription(
  subscription: Stripe.Subscription,
  eventId: string,
  fallbackUserId?: string,
  stripe?: Stripe,
): Promise<StripeBillingEventResult> {
  const plan = getStripePlanFromSubscription(subscription);
  if (!plan) {
    safeLogger.warn("[stripe/webhook] Subscription uses an unknown price", {
      subscriptionId: subscription.id,
    });
    return {
      status: "failure",
      code: "unknown_subscription_price",
      objectId: subscription.id,
    };
  }

  const userId = fallbackUserId ?? await findUserIdForSubscription(subscription);
  if (!userId) {
    safeLogger.warn("[stripe/webhook] No LiveSwell user found for subscription", {
      subscriptionId: subscription.id,
    });
    return {
      status: "failure",
      code: "subscription_user_not_found",
      objectId: subscription.id,
    };
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
    migrationIntentId: subscription.metadata?.migration_intent_id,
    subscriptionCreatedAt: subscription.created,
    verifyWhopActiveAfterLock: verifyCanonicalWhopMembershipActive,
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
            migrationIntentId: latest.metadata?.migration_intent_id,
            subscriptionCreatedAt: latest.created,
          };
        }
      : undefined,
  });
  console.log(
    `[stripe/webhook] ${subscription.id} (${subscription.status}) reconciled: changed=${result.changed}, ignored=${result.ignored}`,
  );
  return {
    status: result.ignored ? "failure" : "success",
    code: result.ignored ? "subscription_reconciliation_ignored" : "subscription_reconciled",
    userId,
    objectId: subscription.id,
  };
}

/**
 * Applies a signature-verified event to LiveSwell access. stripe-replit-sync
 * persists the raw Stripe model separately before this function is called.
 */
export async function processStripeBillingEvent(event: Stripe.Event): Promise<StripeBillingEventResult> {
  if (event.type.startsWith("customer.subscription.")) {
    const eventSubscription = event.data.object as Stripe.Subscription;
    const stripe = await getUncachableStripeClient();
    // Always reconcile the provider's current object, not the possibly stale
    // event snapshot. This makes same-subscription event reordering harmless.
    const currentSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
    const result = await reconcileVerifiedSubscription(
      currentSubscription,
      event.id,
      eventSubscription.metadata.clerk_user_id || undefined,
      stripe,
    );
    return result.status === "success"
      ? { ...result, code: "subscription_lifecycle_reconciled" }
      : result;
  }

  if (event.type === "checkout.session.completed") {
    const stripe = await getUncachableStripeClient();
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const result = await reconcileVerifiedSubscription(
        subscription,
        event.id,
        session.metadata?.clerk_user_id ?? session.client_reference_id ?? undefined,
        stripe,
      );
      return result.status === "success"
        ? { ...result, code: "checkout_completed_reconciled" }
        : result;
    }
    return {
      status: "failure",
      code: "checkout_subscription_missing",
      objectId: session.id,
    };
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const stripe = await getUncachableStripeClient();
    const subscriptionId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice);
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const result = await reconcileVerifiedSubscription(subscription, event.id, undefined, stripe);
      if (result.status !== "success") return result;
      return {
        ...result,
        code:
          event.type === "invoice.payment_failed"
            ? "invoice_payment_failed_reconciled"
            : "invoice_paid_reconciled",
      };
    }
    return {
      status: "failure",
      code: "invoice_subscription_missing",
      objectId: (event.data.object as Stripe.Invoice).id,
    };
  }
  return {
    status: "ignored",
    code: "unsupported_event_type",
    objectId: event.type,
  };
}