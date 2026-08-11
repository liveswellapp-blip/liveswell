-- Migration: normalize existing phone values and enforce uniqueness on verified_phones.phone
--
-- Step 1: Canonicalize all +‐prefixed phone values already in the table.
--         Before this change normalizePhone() preserved any formatting after the
--         leading '+', so rows like '+1 (555) 123-4567' may exist alongside the
--         canonical '+15551234567'.  Strip every non-digit character (keeping the
--         leading '+') so the deduplication and unique index operate on the same
--         value space as the updated normalizer.
UPDATE "verified_phones"
SET phone = '+' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone LIKE '+%';

-- Step 2: Remove any duplicates that canonicalization may have produced.
--         Keep the most recently verified row for each phone number; any row that
--         appears more than once after normalization is considered a duplicate
--         (same physical phone, different stored formatting or prior data).
DELETE FROM "verified_phones"
WHERE id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM "verified_phones"
  ORDER BY phone, verified_at DESC
);

-- Step 3: Add the unique constraint so future inserts are atomic.
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_verified_phones_phone"
  ON "verified_phones" ("phone");
