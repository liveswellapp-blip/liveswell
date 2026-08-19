ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "billing_migration_intent_id" varchar(64);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "billing_migration_intent_expires_at" timestamp;