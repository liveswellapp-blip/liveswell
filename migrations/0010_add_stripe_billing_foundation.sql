-- Stripe billing foundation: application references only. The synchronized
-- stripe schema is owned exclusively by stripe-replit-sync.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_provider" varchar(16);

-- Existing paid accounts are Whop-backed until they voluntarily migrate.
UPDATE "users"
SET "billing_provider" = 'whop'
WHERE "whop_membership_id" IS NOT NULL
  AND "billing_provider" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_unique"
  ON "users" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_subscription_id_unique"
  ON "users" ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;
