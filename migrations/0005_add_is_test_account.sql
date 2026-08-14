ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;
