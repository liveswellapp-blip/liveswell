-- Migration: add limit_type column to sms_rate_limits
-- Safe to run against databases that already have the column (IF NOT EXISTS guard).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sms_rate_limits'
      AND column_name  = 'limit_type'
  ) THEN
    ALTER TABLE "sms_rate_limits" ADD COLUMN "limit_type" text NOT NULL DEFAULT 'outbound';
  END IF;
END $$;

-- Also ensure the index exists (will error if duplicate name exists, so guard it)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'IDX_sms_rate_limits_user_phone_type_sent'
  ) THEN
    CREATE INDEX "IDX_sms_rate_limits_user_phone_type_sent"
      ON "sms_rate_limits" ("user_id", "phone", "limit_type", "sent_at");
  END IF;
END $$;
