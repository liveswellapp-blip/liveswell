-- Migration: add admin_settings key-value table
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "key"        text PRIMARY KEY,
  "value"      text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
