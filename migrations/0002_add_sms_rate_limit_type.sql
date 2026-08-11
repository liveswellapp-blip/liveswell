-- Migration: add limit_type column to sms_rate_limits
-- Uses native ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) — no PL/pgSQL needed.
ALTER TABLE "sms_rate_limits" ADD COLUMN IF NOT EXISTS "limit_type" text NOT NULL DEFAULT 'outbound';
