import type Stripe from "stripe";
import {
  LIVESWELL_STRIPE_PRICES,
  LIVESWELL_STRIPE_PRODUCT,
} from "../server/stripe-catalog";
import { getUncachableStripeClient } from "../server/stripe-client";

async function findLiveSwellProduct(stripe: Stripe): Promise<Stripe.Product | undefined> {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    const isLiveSwellProduct = Object.entries(LIVESWELL_STRIPE_PRODUCT.metadata).every(
      ([key, value]) => product.metadata[key] === value,
    );
    if (isLiveSwellProduct) {
      return product;
    }
  }
  return undefined;
}

function assertExpectedPrice(
  price: Stripe.Price,
  productId: string,
  definition: (typeof LIVESWELL_STRIPE_PRICES)[number],
): void {
  const actualProductId = typeof price.product === "string" ? price.product : price.product.id;
  const matchesDefinition =
    actualProductId === productId &&
    price.unit_amount === definition.unitAmount &&
    price.currency === definition.currency &&
    price.recurring?.interval === definition.interval;

  if (!matchesDefinition) {
    throw new Error(
      `Stripe lookup key ${definition.lookupKey} already belongs to a different LiveSwell catalog price. ` +
        "Create a new catalog version instead of changing a Stripe price in place.",
    );
  }
}

async function seedProducts(): Promise<void> {
  const stripe = await getUncachableStripeClient();
  let product = await findLiveSwellProduct(stripe);

  if (!product) {
    product = await stripe.products.create(LIVESWELL_STRIPE_PRODUCT);
    console.log(`[stripe/catalog] Created ${product.name} (${product.id}).`);
  } else {
    console.log(`[stripe/catalog] Reusing ${product.name} (${product.id}).`);
  }

  for (const definition of LIVESWELL_STRIPE_PRICES) {
    const existingPrices = await stripe.prices.list({
      lookup_keys: [definition.lookupKey],
      limit: 1,
    });
    const existing = existingPrices.data[0];

    if (existing) {
      assertExpectedPrice(existing, product.id, definition);
      console.log(
        `[stripe/catalog] Reusing ${definition.key} price (${existing.id}, ${definition.lookupKey}).`,
      );
      continue;
    }

    const price = await stripe.prices.create({
      product: product.id,
      lookup_key: definition.lookupKey,
      unit_amount: definition.unitAmount,
      currency: definition.currency,
      recurring: { interval: definition.interval },
      metadata: definition.metadata,
    });
    console.log(`[stripe/catalog] Created ${definition.key} price (${price.id}, ${definition.lookupKey}).`);
  }
}

seedProducts().catch((error) => {
  console.error("[stripe/catalog] Failed to seed LiveSwell Pro prices:", error);
  process.exitCode = 1;
});
