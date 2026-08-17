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

    // Pre-flight: is_test_account column (migration 0005).
    await pool.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "is_test_account" boolean NOT NULL DEFAULT false
    `);

    // Pre-flight: is_suspended column (migration 0006).
    await pool.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "is_suspended" boolean NOT NULL DEFAULT false
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

    // ── Post-migration repair guards for tables that suffered bootstrap drift ─
    // These run AFTER migrate() so a fresh database gets its tables from
    // migration 0000 first (which lacks IF NOT EXISTS on some CREATE TABLE
    // statements).  On existing databases where 0007 has been applied, these
    // are no-ops.  On existing databases where 0007 was skipped due to a
    // timestamp ordering edge-case, these ensure the tables are present before
    // any route handler runs.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "apns_device_tokens" (
        "id"           serial PRIMARY KEY NOT NULL,
        "user_id"      varchar NOT NULL,
        "device_token" text NOT NULL,
        "created_at"   timestamp DEFAULT now(),
        "updated_at"   timestamp DEFAULT now(),
        CONSTRAINT "UQ_apns_device_tokens_user_token" UNIQUE ("user_id", "device_token")
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_apns_device_tokens_user_id"
      ON "apns_device_tokens" ("user_id")
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "fcm_device_tokens" (
        "id"           serial PRIMARY KEY NOT NULL,
        "user_id"      varchar NOT NULL,
        "device_token" text NOT NULL,
        "created_at"   timestamp DEFAULT now(),
        "updated_at"   timestamp DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fcm_device_tokens_user_id"
      ON "fcm_device_tokens" ("user_id")
    `);
    // Add FK if the table was created without one (e.g. by an earlier repair path).
    // DO $$ runs via the WebSocket pool, which supports PL/pgSQL — safe here.
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name        = 'fcm_device_tokens'
            AND constraint_name   = 'fcm_device_tokens_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "fcm_device_tokens"
            ADD CONSTRAINT "fcm_device_tokens_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "push_health_alert_state" (
        "alert_key"       text PRIMARY KEY,
        "last_alerted_at" timestamp,
        "last_was_ok"     boolean NOT NULL DEFAULT true,
        "updated_at"      timestamp DEFAULT now() NOT NULL
      )
    `);

    // ── Post-migration schema health check ───────────────────────────────────
    // Warns when a table or column that shared/schema.ts expects is absent from
    // the live database.  This catches any future drift before it breaks a
    // feature instead of surfacing as a cryptic runtime error.
    await checkSchemaHealth();
  } catch (err) {
    console.error('[migrate] Migration failed:', err);
    throw err;
  }
}

/**
 * Queries information_schema to verify that every table and column defined in
 * shared/schema.ts exists in the live database.  Logs a WARNING for each
 * missing object so startup logs surface drift before it breaks a feature.
 * Non-fatal — does not crash the server.
 *
 * IMPORTANT: Keep this list in sync with shared/schema.ts whenever columns are
 * added or removed.
 */
async function checkSchemaHealth(): Promise<void> {
  // Every table defined in shared/schema.ts.
  const requiredTables = [
    'users',
    'locations',
    'surf_conditions',
    'favorites',
    'user_profiles',
    'notification_settings',
    'user_alerts',
    'alert_trigger_log',
    'push_subscriptions',
    'phone_verification_tokens',
    'verified_phones',
    'agent_conversations',
    'agent_sms_threads',
    'weather_cache_entries',
    'apns_device_tokens',
    'fcm_device_tokens',
    'sms_rate_limits',
    'push_health_alert_state',
  ];

  // Every (table, column) pair defined in shared/schema.ts.
  const requiredColumns: Array<[string, string]> = [
    // users
    ['users', 'id'],
    ['users', 'email'],
    ['users', 'first_name'],
    ['users', 'last_name'],
    ['users', 'profile_image_url'],
    ['users', 'is_pro'],
    ['users', 'is_test_account'],
    ['users', 'is_suspended'],
    ['users', 'whop_membership_id'],
    ['users', 'created_at'],
    ['users', 'updated_at'],
    // locations
    ['locations', 'id'],
    ['locations', 'name'],
    ['locations', 'city'],
    ['locations', 'country'],
    ['locations', 'latitude'],
    ['locations', 'longitude'],
    ['locations', 'is_coastal'],
    // surf_conditions
    ['surf_conditions', 'id'],
    ['surf_conditions', 'location_id'],
    ['surf_conditions', 'wave_height'],
    ['surf_conditions', 'wave_period'],
    ['surf_conditions', 'wave_direction'],
    ['surf_conditions', 'wind_speed'],
    ['surf_conditions', 'wind_direction'],
    ['surf_conditions', 'wind_gusts'],
    ['surf_conditions', 'tide_height'],
    ['surf_conditions', 'tide_status'],
    ['surf_conditions', 'water_temp'],
    ['surf_conditions', 'visibility'],
    ['surf_conditions', 'uv_index'],
    ['surf_conditions', 'sunrise'],
    ['surf_conditions', 'sunset'],
    ['surf_conditions', 'last_updated'],
    // favorites
    ['favorites', 'id'],
    ['favorites', 'user_id'],
    ['favorites', 'location_id'],
    ['favorites', 'added_at'],
    // user_profiles
    ['user_profiles', 'id'],
    ['user_profiles', 'user_id'],
    ['user_profiles', 'default_location'],
    ['user_profiles', 'units'],
    ['user_profiles', 'language'],
    ['user_profiles', 'push_notifications'],
    ['user_profiles', 'email_notifications'],
    ['user_profiles', 'auto_refresh'],
    ['user_profiles', 'refresh_interval'],
    ['user_profiles', 'created_at'],
    ['user_profiles', 'updated_at'],
    // notification_settings
    ['notification_settings', 'id'],
    ['notification_settings', 'user_id'],
    ['notification_settings', 'sms_enabled'],
    ['notification_settings', 'phone_number'],
    ['notification_settings', 'push_enabled'],
    ['notification_settings', 'notification_time'],
    ['notification_settings', 'timezone'],
    ['notification_settings', 'location_id'],
    ['notification_settings', 'created_at'],
    ['notification_settings', 'updated_at'],
    // user_alerts
    ['user_alerts', 'id'],
    ['user_alerts', 'user_id'],
    ['user_alerts', 'location_id'],
    ['user_alerts', 'label'],
    ['user_alerts', 'alert_type'],
    ['user_alerts', 'delivery_channels'],
    ['user_alerts', 'frequency'],
    ['user_alerts', 'notification_time'],
    ['user_alerts', 'notification_time_two'],
    ['user_alerts', 'timezone'],
    ['user_alerts', 'phone_number'],
    ['user_alerts', 'phone_verified'],
    ['user_alerts', 'active'],
    ['user_alerts', 'thresholds'],
    ['user_alerts', 'last_fired_at'],
    ['user_alerts', 'cooldown_hours'],
    ['user_alerts', 'email_unsubscribed'],
    ['user_alerts', 'sms_opted_out'],
    ['user_alerts', 'created_at'],
    ['user_alerts', 'updated_at'],
    // alert_trigger_log
    ['alert_trigger_log', 'id'],
    ['alert_trigger_log', 'alert_id'],
    ['alert_trigger_log', 'fired_at'],
    ['alert_trigger_log', 'trigger_reason'],
    ['alert_trigger_log', 'condition_snapshot'],
    // push_subscriptions
    ['push_subscriptions', 'id'],
    ['push_subscriptions', 'user_id'],
    ['push_subscriptions', 'endpoint'],
    ['push_subscriptions', 'p256dh_key'],
    ['push_subscriptions', 'auth_key'],
    ['push_subscriptions', 'user_agent'],
    ['push_subscriptions', 'created_at'],
    ['push_subscriptions', 'updated_at'],
    // phone_verification_tokens
    ['phone_verification_tokens', 'id'],
    ['phone_verification_tokens', 'user_id'],
    ['phone_verification_tokens', 'phone'],
    ['phone_verification_tokens', 'code'],
    ['phone_verification_tokens', 'expires_at'],
    // verified_phones
    ['verified_phones', 'id'],
    ['verified_phones', 'user_id'],
    ['verified_phones', 'phone'],
    ['verified_phones', 'verified_at'],
    // agent_conversations
    ['agent_conversations', 'id'],
    ['agent_conversations', 'user_id'],
    ['agent_conversations', 'role'],
    ['agent_conversations', 'content'],
    ['agent_conversations', 'created_at'],
    // agent_sms_threads
    ['agent_sms_threads', 'id'],
    ['agent_sms_threads', 'phone_number'],
    ['agent_sms_threads', 'messages'],
    ['agent_sms_threads', 'updated_at'],
    // weather_cache_entries
    ['weather_cache_entries', 'cache_key'],
    ['weather_cache_entries', 'data'],
    ['weather_cache_entries', 'fetched_at'],
    // apns_device_tokens
    ['apns_device_tokens', 'id'],
    ['apns_device_tokens', 'user_id'],
    ['apns_device_tokens', 'device_token'],
    ['apns_device_tokens', 'created_at'],
    ['apns_device_tokens', 'updated_at'],
    // fcm_device_tokens
    ['fcm_device_tokens', 'id'],
    ['fcm_device_tokens', 'user_id'],
    ['fcm_device_tokens', 'device_token'],
    ['fcm_device_tokens', 'created_at'],
    ['fcm_device_tokens', 'updated_at'],
    // sms_rate_limits
    ['sms_rate_limits', 'id'],
    ['sms_rate_limits', 'user_id'],
    ['sms_rate_limits', 'phone'],
    ['sms_rate_limits', 'limit_type'],
    ['sms_rate_limits', 'sent_at'],
    // push_health_alert_state
    ['push_health_alert_state', 'alert_key'],
    ['push_health_alert_state', 'last_alerted_at'],
    ['push_health_alert_state', 'last_was_ok'],
    ['push_health_alert_state', 'updated_at'],
  ];

  try {
    const { rows: tableRows } = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM   information_schema.tables
      WHERE  table_schema = 'public'
    `);
    const existingTables = new Set(tableRows.map(r => r.table_name));

    for (const t of requiredTables) {
      if (!existingTables.has(t)) {
        console.warn(`[schema-health] ⚠ MISSING TABLE: "${t}" — run migrations or check _journal.json`);
      }
    }

    const { rows: colRows } = await pool.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM   information_schema.columns
      WHERE  table_schema = 'public'
    `);
    const existingCols = new Set(colRows.map(r => `${r.table_name}.${r.column_name}`));

    for (const [table, col] of requiredColumns) {
      if (!existingCols.has(`${table}.${col}`)) {
        console.warn(`[schema-health] ⚠ MISSING COLUMN: "${table}"."${col}" — run migrations or check _journal.json`);
      }
    }
  } catch (err) {
    // Non-fatal — the health check itself should never crash startup.
    console.warn('[schema-health] Could not run schema health check:', err);
  }
}
