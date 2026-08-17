-- Migration: create tables that were present in 0000 but never applied to
-- databases bootstrapped via drizzle-kit push before those tables were added
-- to the schema.  All statements are idempotent (IF NOT EXISTS) so this is
-- safe to run on databases that already have these objects.

-- APNs device tokens for native iOS push notifications
CREATE TABLE IF NOT EXISTS "apns_device_tokens" (
  "id"           serial PRIMARY KEY NOT NULL,
  "user_id"      varchar NOT NULL,
  "device_token" text NOT NULL,
  "created_at"   timestamp DEFAULT now(),
  "updated_at"   timestamp DEFAULT now(),
  CONSTRAINT "UQ_apns_device_tokens_user_token" UNIQUE ("user_id", "device_token")
);

CREATE INDEX IF NOT EXISTS "IDX_apns_device_tokens_user_id"
  ON "apns_device_tokens" ("user_id");

-- FCM device tokens for native Android push notifications
CREATE TABLE IF NOT EXISTS "fcm_device_tokens" (
  "id"           serial PRIMARY KEY NOT NULL,
  "user_id"      varchar NOT NULL REFERENCES "users"("id"),
  "device_token" text NOT NULL,
  "created_at"   timestamp DEFAULT now(),
  "updated_at"   timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_fcm_device_tokens_user_id"
  ON "fcm_device_tokens" ("user_id");

-- push_health_alert_state — tracks per-key alert cooldown state.
-- Idempotent guard in case the table was created manually on some databases.
CREATE TABLE IF NOT EXISTS "push_health_alert_state" (
  "alert_key"       text PRIMARY KEY,
  "last_alerted_at" timestamp,
  "last_was_ok"     boolean NOT NULL DEFAULT true,
  "updated_at"      timestamp DEFAULT now() NOT NULL
);
