#!/bin/bash
set -e

# Run migrations FIRST (fast, must complete within timeout)
node -e "
const { Pool } = require('@neondatabase/serverless');
const { neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  -- Alert trigger history log
  CREATE TABLE IF NOT EXISTS alert_trigger_log (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES user_alerts(id) ON DELETE CASCADE,
    fired_at TIMESTAMP NOT NULL DEFAULT NOW(),
    trigger_reason TEXT NOT NULL,
    condition_snapshot JSONB
  );
  CREATE INDEX IF NOT EXISTS idx_alert_trigger_log_alert_id ON alert_trigger_log(alert_id);

  -- Condition alert columns
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS thresholds JSONB;
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMP;
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NOT NULL DEFAULT 4;

  -- Phone verification column (Task #11)
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

  -- Email unsubscribe flag
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN NOT NULL DEFAULT FALSE;

  -- SMS opt-out flag: set when user replies STOP to a text message
  ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN NOT NULL DEFAULT FALSE;

  -- Push / APNs health-alert cooldown state (Task #45)
  -- Tracks last-alerted timestamp per check key so repeated failures don't
  -- spam the inbox (24-hour cooldown with recovered→failed bypass).
  CREATE TABLE IF NOT EXISTS push_health_alert_state (
    alert_key    TEXT PRIMARY KEY,
    last_alerted_at TIMESTAMP,
    last_was_ok  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
  );
\`).then(() => { console.log('Migrations applied'); pool.end(); })
  .catch(e => { console.error(e); process.exit(1); });
"

# Install dependencies (prefer offline cache to stay within timeout)
npm install --prefer-offline
