CREATE TABLE IF NOT EXISTS "billing_operational_events" (
  "id" serial PRIMARY KEY,
  "provider" varchar(16) NOT NULL,
  "operation" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL,
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "event_id" varchar(128),
  "object_id" varchar(128),
  "code" varchar(128),
  "resolved_at" timestamp,
  "resolved_by" varchar(128),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "billing_operational_events_status_check"
    CHECK ("status" IN ('success', 'failure', 'ignored'))
);

CREATE INDEX IF NOT EXISTS "IDX_billing_ops_created_at"
  ON "billing_operational_events" ("created_at");
CREATE INDEX IF NOT EXISTS "IDX_billing_ops_user_created_at"
  ON "billing_operational_events" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "IDX_billing_ops_status_resolved"
  ON "billing_operational_events" ("status", "resolved_at");