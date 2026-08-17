CREATE TABLE IF NOT EXISTS "user_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_user_events_user_id_created_at" ON "user_events" ("user_id", "created_at");
