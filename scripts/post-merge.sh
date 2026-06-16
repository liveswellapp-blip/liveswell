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
\`).then(() => { console.log('Migrations applied'); pool.end(); })
  .catch(e => { console.error(e); process.exit(1); });
"

# Install dependencies (prefer offline cache to stay within timeout)
npm install --prefer-offline
