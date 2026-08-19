import type Stripe from "stripe";
import { getUncachableStripeClient } from "../server/stripe-client";
import {
  LIVESWELL_STRIPE_PRICES,
  LIVESWELL_STRIPE_PRODUCT,
} from "../server/stripe-catalog";

type ExpectedMode = "test" | "live";

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function fail(message: string): never {
  throw new Error(message);
}

function assertPrice(
  price: Stripe.Price,
  product: Stripe.Product | Stripe.DeletedProduct,
  definition: (typeof LIVESWELL_STRIPE_PRICES)[number],
  expectedLivemode: boolean,
): void {
  if (
    !price.active ||
    product.deleted ||
    price.livemode !== expectedLivemode ||
    price.lookup_key !== definition.lookupKey ||
    price.unit_amount !== definition.unitAmount ||
    price.currency !== definition.currency ||
    price.recurring?.interval !== definition.interval ||
    price.metadata.liveswell_app !== definition.metadata.liveswell_app ||
    price.metadata.catalog_version !== definition.metadata.catalog_version ||
    price.metadata.liveswell_plan !== definition.metadata.liveswell_plan ||
    product.metadata.liveswell_product !== LIVESWELL_STRIPE_PRODUCT.metadata.liveswell_product ||
    product.metadata.liveswell_app !== LIVESWELL_STRIPE_PRODUCT.metadata.liveswell_app ||
    product.metadata.catalog_version !== LIVESWELL_STRIPE_PRODUCT.metadata.catalog_version
  ) {
    fail(`Catalog verification failed for lookup key ${definition.lookupKey}.`);
  }
}

async function verify(): Promise<void> {
  const expectedMode = argument("expect-mode") as ExpectedMode | undefined;
  const originValue = argument("origin");
  if (expectedMode !== "test" && expectedMode !== "live") {
    fail("Pass --expect-mode=test or --expect-mode=live explicitly.");
  }
  if (!originValue) fail("Pass the deployed app origin with --origin=https://example.com.");
  const origin = new URL(originValue);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) {
    fail("--origin must be an HTTPS origin without a path, query, or hash.");
  }

  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve();
  const expectedLivemode = expectedMode === "live";
  const verifiedPrices: Array<{ lookupKey: string; id: string }> = [];

  for (const definition of LIVESWELL_STRIPE_PRICES) {
    const prices = await stripe.prices.list({
      active: true,
      lookup_keys: [definition.lookupKey],
      limit: 2,
    });
    if (prices.data.length !== 1) {
      fail(`Expected exactly one active Stripe price for ${definition.lookupKey}.`);
    }
    const price = prices.data[0];
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);
    assertPrice(price, product, definition, expectedLivemode);
    verifiedPrices.push({ lookupKey: definition.lookupKey, id: price.id });
  }

  const expectedWebhookUrl = `${origin.origin}/api/stripe/webhook`;
  const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const webhook = webhookEndpoints.data.find(
    (endpoint) => endpoint.url === expectedWebhookUrl && endpoint.status === "enabled",
  );
  if (!webhook) fail(`No enabled Stripe webhook exists at ${expectedWebhookUrl}.`);
  if (webhook.livemode !== expectedLivemode) {
    fail(`The webhook at ${expectedWebhookUrl} is not in ${expectedMode} mode.`);
  }

  const requiredEvents = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ];
  if (
    !webhook.enabled_events.includes("*") &&
    requiredEvents.some((event) => !webhook.enabled_events.includes(event as Stripe.WebhookEndpointCreateParams.EnabledEvent))
  ) {
    fail("The managed webhook is missing one or more required billing events.");
  }

  if (expectedMode === "live" && (!account.charges_enabled || !account.details_submitted)) {
    fail("The connected live Stripe account is not ready to accept charges.");
  }

  console.log(JSON.stringify({
    ok: true,
    mode: expectedMode,
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
    webhook: { id: webhook.id, url: webhook.url, status: webhook.status },
    prices: verifiedPrices,
  }, null, 2));
}

verify().catch((error) => {
  console.error(
    `[stripe/preflight] ${error instanceof Error ? error.message : "Launch verification failed."}`,
  );
  process.exitCode = 1;
});