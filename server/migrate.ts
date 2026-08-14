import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { db, pool } from './db';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Drizzle's default schema/table for migration tracking.
const DRIZZLE_SCHEMA = 'drizzle';
const DRIZZLE_TABLE  = '__drizzle_migrations';

/**
 * Returns the number of rows already recorded in the Drizzle migration-history
 * table (0 when the table doesn't exist yet).
 */
async function appliedMigrationCount(): Promise<number> {
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM   information_schema.tables t
       JOIN   "${DRIZZLE_SCHEMA}"."${DRIZZLE_TABLE}" m ON TRUE
       WHERE  t.table_schema = $1
         AND  t.table_name   = $2`,
      [DRIZZLE_SCHEMA, DRIZZLE_TABLE]
    );
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    // Table or schema doesn't exist yet.
    return 0;
  }
}

/**
 * Returns true when the "users" table already exists, indicating that the
 * schema was previously applied via "drizzle-kit push" (no migration history).
 */
async function schemaAlreadyExists(): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name   = 'users'
     ) AS exists`
  );
  return result.rows[0]?.exists ?? false;
}

/**
 * Seeds the Drizzle migration-history table so that all existing migrations
 * are recorded as already applied.  This is only needed once — for databases
 * that were initially set up with "drizzle-kit push" instead of
 * "drizzle-kit migrate".  After this seed, future migrations will run
 * normally via migrate().
 */
async function seedMigrationHistory(migrationsFolder: string): Promise<void> {
  const fs = await import('fs');
  const { createHash } = await import('crypto');
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');

  if (!fs.existsSync(journalPath)) {
    console.warn('[migrate] No journal found; skipping migration history seed.');
    return;
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };

  // Drizzle creates a dedicated schema and table for tracking migrations.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${DRIZZLE_SCHEMA}"`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${DRIZZLE_SCHEMA}"."${DRIZZLE_TABLE}" (
      id         SERIAL PRIMARY KEY,
      hash       text   NOT NULL,
      created_at bigint
    )
  `);

  // Insert every journal entry so migrate() considers them already applied.
  for (const entry of journal.entries) {
    const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlFile)) {
      console.warn(`[migrate] SQL file not found for tag ${entry.tag}; skipping seed entry.`);
      continue;
    }
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const hash = createHash('sha256').update(sqlContent).digest('hex');

    await pool.query(
      `INSERT INTO "${DRIZZLE_SCHEMA}"."${DRIZZLE_TABLE}" (hash, created_at)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM "${DRIZZLE_SCHEMA}"."${DRIZZLE_TABLE}" WHERE hash = $1
       )`,
      [hash, entry.when]
    );
  }

  console.log(`[migrate] Seeded migration history with ${journal.entries.length} existing migration(s).`);
}

/**
 * Runs all pending Drizzle migrations from the ./migrations folder.
 * Safe to call on every startup — already-applied migrations are skipped.
 *
 * Handles the bootstrapping case: if the schema was set up via "drizzle-kit push"
 * (no migration tracking table, or an empty tracking table from a prior failed
 * attempt), this function seeds the migration history first so that migrate()
 * only applies *new* migrations going forward.
 *
 * This ensures a fresh environment (or a new deploy) has the correct schema
 * without any manual intervention.
 */
export async function runMigrations(): Promise<void> {
  // Use process.cwd() so this works in both dev (tsx) and prod (node dist/index.js),
  // falling back to the dist-relative path for environments where cwd differs.
  const migrationsFolder = path.resolve(process.cwd(), 'migrations');
  console.log('[migrate] Checking database migrations…');

  try {
    // Pre-flight: directly add any columns / indexes that migration-system bugs may have missed.
    // Using pool.query (not Drizzle) so it runs regardless of migration state.
    await pool.query(`
      ALTER TABLE IF EXISTS "sms_rate_limits"
      ADD COLUMN IF NOT EXISTS "limit_type" text NOT NULL DEFAULT 'outbound'
    `);

    // Pre-flight: Whop subscription columns (migration 0004).
    // Added here so databases that were seeded before this migration existed
    // (and therefore have it marked as applied in the tracking table without
    // the column actually being present) still get the column on next startup.
    await pool.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "is_pro" boolean NOT NULL DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "whop_membership_id" text
    `);

    // Pre-flight: canonicalize phone values and enforce uniqueness on
    // verified_phones.phone — but only if the table already exists.
    // On a fresh database migration 0000 hasn't run yet, so the table is
    // absent; on an existing deployment it is present and needs backfilling.
    const { rows: [{ vp_exists }] } = await pool.query<{ vp_exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'verified_phones'
      ) AS vp_exists
    `);

    if (vp_exists) {
      // Canonicalize any +‐prefixed phone values stored before normalizePhone()
      // was fixed to strip punctuation.  Already-canonical values are unchanged.
      await pool.query(`
        UPDATE "verified_phones"
        SET phone = '+' || regexp_replace(phone, '[^0-9]', '', 'g')
        WHERE phone LIKE '+%'
          AND phone <> '+' || regexp_replace(phone, '[^0-9]', '', 'g')
      `);

      // Remove any duplicates produced by canonicalization, keeping the most
      // recently verified row per phone number.
      await pool.query(`
        DELETE FROM "verified_phones"
        WHERE id NOT IN (
          SELECT DISTINCT ON (phone) id
          FROM "verified_phones"
          ORDER BY phone, verified_at DESC
        )
      `);

      // Enforce one-account-per-phone at the database level.
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_verified_phones_phone"
        ON "verified_phones" ("phone")
      `);
    }

    const applied = await appliedMigrationCount();

    if (applied === 0) {
      const hasSchema = await schemaAlreadyExists();
      if (hasSchema) {
        // Database was set up with db:push (or a prior failed run left the
        // tracking table empty) — seed history so migrate() won't try to
        // re-create tables that already exist.
        console.log('[migrate] Existing schema detected without migration history. Seeding…');
        await seedMigrationHistory(migrationsFolder);
      }
      // If !hasSchema, this is a truly fresh database — migrate() will apply
      // everything from scratch, which is exactly what we want.
    }

    await migrate(db, { migrationsFolder });
    console.log('[migrate] All migrations applied successfully.');
  } catch (err) {
    console.error('[migrate] Migration failed:', err);
    throw err;
  }
}
