-- Track overlapping Pro entitlements independently so a billing provider can
-- only revoke the access it owns.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "paid_pro" boolean NOT NULL DEFAULT false;
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "complimentary_pro" boolean NOT NULL DEFAULT false;

-- Existing paid users were identified during the Stripe foundation migration.
UPDATE "users"
SET "paid_pro" = true
WHERE "is_pro" = true
  AND "billing_provider" IN ('whop', 'stripe');

-- Existing non-test Pro users without a billing provider are complimentary.
UPDATE "users"
SET "complimentary_pro" = true
WHERE "is_pro" = true
  AND "billing_provider" IS NULL
  AND "is_test_account" = false;

-- Keep the public access bit consistent with its source-specific caches.
UPDATE "users"
SET "is_pro" = ("paid_pro" OR "complimentary_pro" OR "is_test_account");