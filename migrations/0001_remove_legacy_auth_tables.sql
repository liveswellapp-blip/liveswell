-- Migration: remove legacy custom-auth tables and columns
-- Safe to run against databases where these objects may already be gone.

-- Drop password_reset_tokens table left over from the custom auth era.
-- connect-pg-simple still manages its own "sessions" table at runtime
-- (createTableIfMissing: true in server/auth.ts), so that table is
-- intentionally left out of this migration.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
  ) THEN
    DROP TABLE "password_reset_tokens" CASCADE;
  END IF;
END $$;

-- Drop password_hash column from users table (replaced by Clerk auth).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'users'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE "users" DROP COLUMN "password_hash";
  END IF;
END $$;
