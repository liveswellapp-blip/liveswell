ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "billing_migration_state" varchar(32);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "billing_migration_started_at" timestamp;