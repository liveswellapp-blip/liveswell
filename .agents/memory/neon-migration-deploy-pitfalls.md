---
name: Neon migration deploy pitfalls
description: Two hard-won lessons about Drizzle migrations on Neon serverless in a GCE-deployed Replit app.
---

# Neon migration deploy pitfalls

## Rule 1: Copy migrations/ into dist/ at build time

The build script (`vite build && esbuild ...`) does NOT copy the `migrations/` folder.
In GCE production the server runs `dist/index.js`; if `migrations/` isn't inside `dist/`,
Drizzle's `migrate()` silently reports "All migrations applied successfully" against only
the journal entries it can read — leaving new migrations unapplied with no error.

**Fix already applied:** `package.json` build script now ends with `&& cp -r migrations dist/migrations`.
`server/migrate.ts` uses `path.resolve(process.cwd(), 'migrations')` (workspace root, works in dev and prod).

**Why:** `__dirname` in the ESM build points to `dist/`; `../migrations` resolves correctly only if
the whole workspace is on disk, which isn't guaranteed on every GCE VM boot.

## Rule 2: PL/pgSQL DO blocks fail silently on Neon's HTTP driver

```sql
DO $$ BEGIN
  IF NOT EXISTS (...) THEN ALTER TABLE ...; END IF;
END $$;
```

This runs without error but does nothing when the Neon serverless driver uses the HTTP transport
(not WebSocket). Drizzle records the migration hash as applied, the column is never added.

**Fix:** Use native PostgreSQL syntax instead — no PL/pgSQL needed:
```sql
ALTER TABLE "sms_rate_limits" ADD COLUMN IF NOT EXISTS "limit_type" text NOT NULL DEFAULT 'outbound';
```
`ADD COLUMN IF NOT EXISTS` is supported since PostgreSQL 9.6.

## Rule 3: Pre-flight pool.query() as a safety net

`server/migrate.ts` `runMigrations()` now runs a direct `pool.query(ALTER TABLE IF EXISTS ...)` 
before calling `migrate()`. This guarantees critical columns exist regardless of migration file
availability or driver transport issues. The query is idempotent — safe to run on every boot.
