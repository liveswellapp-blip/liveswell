-- Migration: add Whop subscription columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_pro" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whop_membership_id" text;
