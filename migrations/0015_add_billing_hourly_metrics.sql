CREATE TABLE IF NOT EXISTS "billing_hourly_metrics" (
  "bucket" timestamp NOT NULL,
  "provider" varchar(16) NOT NULL,
  "checkout_attempts" integer DEFAULT 0 NOT NULL,
  "checkout_successes" integer DEFAULT 0 NOT NULL,
  "checkout_technical_failures" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "billing_hourly_metrics_bucket_provider_pk"
    PRIMARY KEY ("bucket", "provider")
);

CREATE INDEX IF NOT EXISTS "IDX_billing_hourly_metrics_bucket"
  ON "billing_hourly_metrics" ("bucket");