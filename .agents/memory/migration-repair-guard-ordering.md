---
name: Migration repair guard ordering
description: CREATE TABLE repair guards in server/migrate.ts must run after drizzle migrate(), not before, to avoid breaking fresh-DB startup.
---

# Migration Repair Guard Ordering

## The Rule
`CREATE TABLE IF NOT EXISTS` repair guards in `server/migrate.ts` must be placed **after** `await migrate(db, { migrationsFolder })`, never before.

**Why:** Migration 0000 uses plain `CREATE TABLE` (without `IF NOT EXISTS`) for some tables. If a repair guard creates those tables before 0000 runs, 0000 fails with "relation already exists" and the fresh-database startup path breaks entirely — `users` never gets created, and the server cannot start.

**How to apply:** Only `ALTER TABLE IF EXISTS … ADD COLUMN IF NOT EXISTS` guards are safe before `migrate()` (they no-op when the table doesn't exist yet). Any `CREATE TABLE` repair goes after `migrate()`.

## FK Idempotency via DO $$
When a repair guard needs to add a FK to a table that may already exist without one, use a `DO $$` block. The neon-serverless WebSocket pool (`pool.query`) supports PL/pgSQL — only the Neon HTTP driver is problematic with DO blocks.

## Journal Timestamp Ordering
Migration `when` timestamps must be strictly greater than the largest existing `created_at` in `drizzle.__drizzle_migrations`. Drizzle may skip migrations whose folder timestamp does not exceed the latest recorded entry. When adding a repair migration, use a timestamp visibly larger than all existing entries (e.g., 1786000000000 when existing entries are ~1785xxxxxxxx).
