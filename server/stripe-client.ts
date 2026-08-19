import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { safeLogger } from "./safe-logging";

type StripeCredentials = {
  secretKey: string;
  webhookSecret?: string;
  publishableKey?: string;
};

/**
 * Fetches credentials from Replit's managed Stripe connection.
 *
 * Do not cache this result or the Stripe client: the connection credentials may
 * rotate while the app is running.
 */
async function getStripeCredentials(): Promise<StripeCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !replitToken) {
    throw new Error(
      "Stripe integration environment is unavailable. Connect Stripe through Replit before enabling Stripe billing.",
    );
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: replitToken,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not retrieve Stripe connection credentials (${response.status}).`);
  }

  const data = await response.json() as {
    items?: Array<{
      settings?: {
        // Replit connector versions have used both names. Never log either.
        secret?: string;
        secret_key?: string;
        api_key?: string;
        webhook_secret?: string;
        publishable?: string;
        publishable_key?: string;
      };
    }>;
  };
  const settings = data.items?.[0]?.settings;
  const secretKey = settings?.secret ?? settings?.secret_key ?? settings?.api_key;

  if (!secretKey) {
    throw new Error("Stripe is connected but has no secret key configured.");
  }

  return {
    secretKey,
    webhookSecret: settings?.webhook_secret,
    publishableKey: settings?.publishable ?? settings?.publishable_key,
  };
}

function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to synchronize Stripe data.");
  }
  return process.env.DATABASE_URL;
}

/** Returns a fresh client so rotated managed-connection credentials are honored. */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/**
 * Returns the connector-managed Stripe.js key. Publishable keys are safe to
 * expose to an authenticated browser; secret and webhook keys never leave the
 * server.
 */
export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeCredentials();
  if (!publishableKey || !publishableKey.startsWith("pk_")) {
    throw new Error("Stripe is connected but has no valid publishable key configured.");
  }
  return publishableKey;
}

/** Verifies a webhook against the connector-managed signing secret. */
export async function constructStripeWebhookEvent(
  payload: Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const credentials = await getStripeCredentials();
  if (!credentials.webhookSecret) {
    throw new Error("Stripe webhook signing secret is not configured.");
  }
  const stripe = new Stripe(credentials.secretKey);
  return stripe.webhooks.constructEvent(payload, signature, credentials.webhookSecret);
}

/** Returns a fresh Stripe synchronization engine backed by the app database. */
export async function getStripeSync(): Promise<StripeSync> {
  const [databaseUrl, credentials] = [getDatabaseUrl(), await getStripeCredentials()];

  return new StripeSync({
    poolConfig: {
      connectionString: databaseUrl,
      max: 5,
    },
    stripeSecretKey: credentials.secretKey,
    stripeWebhookSecret: credentials.webhookSecret ?? "",
    // Subscription data should never be overwritten by an older webhook payload.
    revalidateObjectsViaStripeApi: ["subscription", "invoice", "payment_intent"],
    logger: safeLogger,
  });
}
