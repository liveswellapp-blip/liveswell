/**
 * Push Notification Health Monitor
 *
 * Checks VAPID key validity and push notification service health after every
 * deploy (startup check) and on a periodic schedule.  When a problem is
 * detected it sends an admin alert email so the team is notified before users
 * notice missed surf alerts.
 *
 * Also checks APNs credential presence at startup.  When APNS_KEY, APNS_KEY_ID
 * or APNS_TEAM_ID are absent an alert email is sent so the admin knows iOS push
 * is silently disabled before any users are affected.
 *
 * Configuration
 * ─────────────
 * ADMIN_ALERT_EMAIL  – recipient for alert emails (falls back to admin@liveswell.app)
 */

import webpush from 'web-push';
import { ReplitConnectors } from '@replit/connectors-sdk';
import { db } from './db';
import { pushHealthAlertState } from '@shared/schema';
import { eq } from 'drizzle-orm';

/** Env-var fallback for the admin alert email (used if no DB setting exists). */
export const ADMIN_ALERT_EMAIL =
  process.env.ADMIN_ALERT_EMAIL || 'admin@liveswell.app';

/**
 * Resolve the admin alert email address.
 * Priority: DB setting ('alert_email') → ADMIN_ALERT_EMAIL env var → default.
 * Falls back gracefully if the DB is unavailable.
 */
async function resolveAlertEmail(): Promise<string> {
  try {
    // Lazy import to avoid circular deps at module load time
    const { storage } = await import('./storage') as { storage: import('./storage').IStorage };
    const dbValue = await storage.getAdminSetting('alert_email');
    if (dbValue && dbValue.trim()) return dbValue.trim();
  } catch {
    // DB unavailable — fall through to env var
  }
  return ADMIN_ALERT_EMAIL;
}

// --------------------------------------------------------------------------
// Health-check logic
// --------------------------------------------------------------------------

export interface PushHealthResult {
  ok: boolean;
  vapidKeyConfigured: boolean;
  vapidKeyValid: boolean;
  pushServiceStatus: 'healthy' | 'degraded' | 'unhealthy';
  reason?: string;
}

/**
 * Perform a deep VAPID key health check.
 *
 * Validation steps (in order):
 * 1. Check both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars are set.
 * 2. Verify basic format with a regex (URL-safe base64, ≥50 chars).
 * 3. Call webpush.setVapidDetails() in a try/catch — this exercises the
 *    actual web-push library validation and catches malformed keypairs that
 *    pass the regex but are still invalid (wrong length, wrong curve, etc.).
 * 4. Check whether the PushNotificationService singleton initialised
 *    successfully (it may have recorded an init error at startup if keys
 *    were missing/invalid at load time).
 */
export function checkPushHealth(): PushHealthResult {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  // Step 1 — env var presence
  if (!publicKey || !privateKey) {
    return {
      ok: false,
      vapidKeyConfigured: false,
      vapidKeyValid: false,
      pushServiceStatus: 'unhealthy',
      reason: 'VAPID_PUBLIC_KEY and/or VAPID_PRIVATE_KEY environment variables are not set',
    };
  }

  // Step 2 — structural regex (URL-safe base64, sensible length)
  const looksValid =
    publicKey.length > 50 && /^[A-Za-z0-9\-_]+=*$/.test(publicKey);

  if (!looksValid) {
    return {
      ok: false,
      vapidKeyConfigured: true,
      vapidKeyValid: false,
      pushServiceStatus: 'degraded',
      reason: `VAPID_PUBLIC_KEY appears malformed (length=${publicKey.length})`,
    };
  }

  // Step 3 — exercise the actual web-push library validation
  try {
    webpush.setVapidDetails(
      'mailto:admin@liveswell.app',
      publicKey,
      privateKey
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      vapidKeyConfigured: true,
      vapidKeyValid: false,
      pushServiceStatus: 'unhealthy',
      reason: `VAPID keypair rejected by web-push library: ${message}`,
    };
  }

  // Step 4 — check whether the service singleton initialised cleanly
  // (lazy import to avoid a circular-dependency at module load time)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushNotificationService } = require('./push-service') as {
      pushNotificationService: { isOperational(): boolean; getInitError(): Error | null };
    };

    if (!pushNotificationService.isOperational()) {
      const initErr = pushNotificationService.getInitError();
      return {
        ok: false,
        vapidKeyConfigured: true,
        vapidKeyValid: true,
        pushServiceStatus: 'unhealthy',
        reason: `Push service failed to initialise: ${initErr?.message ?? 'unknown error'}`,
      };
    }
  } catch {
    // If push-service itself hasn't loaded yet, skip step 4 gracefully —
    // the startup preflight in index.ts runs before registerRoutes(), so
    // push-service may not be imported yet. The periodic cron checks will
    // catch any lingering issues.
  }

  return {
    ok: true,
    vapidKeyConfigured: true,
    vapidKeyValid: true,
    pushServiceStatus: 'healthy',
  };
}

// --------------------------------------------------------------------------
// Admin email alert
// --------------------------------------------------------------------------

export async function sendAdminAlert(result: PushHealthResult): Promise<void> {
  const subject = '🚨 LiveSwell — Push notifications may be broken after deploy';
  const reason = result.reason ?? 'Unknown reason';
  const alertEmail = await resolveAlertEmail();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!fromEmail) {
    console.error(
      '[push-health-monitor] Cannot send VAPID health alert: RESEND_FROM_EMAIL is not configured',
    );
    return;
  }

  const text = `LiveSwell push notification health check FAILED.

Status : ${result.pushServiceStatus}
Reason : ${reason}
VAPID key configured : ${result.vapidKeyConfigured}
VAPID key valid      : ${result.vapidKeyValid}

Action required
───────────────
1. Check that VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set in the Replit
   Secrets panel for both Development and Production environments.
2. Verify /api/push/vapid-public-key returns { ok: true }.
3. Verify /api/health shows pushNotifications: "healthy".
4. If keys were rotated, re-subscribe affected users.

This alert was generated automatically at ${new Date().toISOString()}.

— LiveSwell monitoring`;

  const html = `
<p><strong>LiveSwell push notification health check <span style="color:#c0392b">FAILED</span>.</strong></p>
<table cellpadding="4" style="border-collapse:collapse;font-family:monospace">
  <tr><td><b>Status</b></td><td>${result.pushServiceStatus}</td></tr>
  <tr><td><b>Reason</b></td><td>${reason}</td></tr>
  <tr><td><b>VAPID key configured</b></td><td>${result.vapidKeyConfigured}</td></tr>
  <tr><td><b>VAPID key valid</b></td><td>${result.vapidKeyValid}</td></tr>
</table>

<h3>Action required</h3>
<ol>
  <li>Check that <code>VAPID_PUBLIC_KEY</code> and <code>VAPID_PRIVATE_KEY</code> are set in the Replit Secrets panel for <em>both</em> Development and Production environments.</li>
  <li>Verify <code>/api/push/vapid-public-key</code> returns <code>{ ok: true }</code>.</li>
  <li>Verify <code>/api/health</code> shows <code>pushNotifications: "healthy"</code>.</li>
  <li>If keys were rotated, re-subscribe affected users.</li>
</ol>

<p style="color:#888;font-size:0.85em">
  Generated automatically at ${new Date().toISOString()}<br>
  — LiveSwell monitoring
</p>`;

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy('resend', '/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: alertEmail,
        subject,
        text,
        html,
      }),
    });

    if (response.ok) {
      console.log(
        `[push-health-monitor] Admin alert sent to ${alertEmail}`
      );
    } else {
      const body = await response.text();
      console.error(
        `[push-health-monitor] Failed to send admin alert: ${body}`
      );
    }
  } catch (err) {
    console.error('[push-health-monitor] Error sending admin alert email:', err);
  }
}

// --------------------------------------------------------------------------
// APNs credential check
// --------------------------------------------------------------------------

export interface ApnsHealthResult {
  ok: boolean;
  configured: boolean;
  missing: string[];
  reason?: string;
}

/**
 * Check whether all three required APNs environment variables are present.
 * Does NOT attempt a live Apple gateway connection — credential presence is
 * the only gate checked here.
 */
export function checkApnsHealth(): ApnsHealthResult {
  const required = ['APNS_KEY', 'APNS_KEY_ID', 'APNS_TEAM_ID'] as const;
  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    return {
      ok: false,
      configured: false,
      missing,
      reason: `Missing APNs environment variable(s): ${missing.join(', ')}. Native iOS push notifications are disabled.`,
    };
  }

  return { ok: true, configured: true, missing: [] };
}

export async function sendApnsAdminAlert(result: ApnsHealthResult): Promise<void> {
  const subject = '⚠️ LiveSwell — APNs credentials not configured (iOS push disabled)';
  const reason = result.reason ?? 'APNs credentials missing';
  const alertEmail = await resolveAlertEmail();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!fromEmail) {
    console.error(
      '[push-health-monitor] Cannot send APNs health alert: RESEND_FROM_EMAIL is not configured',
    );
    return;
  }

  const text = `LiveSwell APNs (Apple Push Notification service) health check FAILED.

Reason : ${reason}

iOS users who grant push-notification permission will NOT receive any alerts
until the credentials are configured.

How to fix
──────────
1. Go to https://developer.apple.com → Certificates, Identifiers & Profiles →
   Keys → create (or download) an APNs key (.p8 file).
2. Copy the full contents of the .p8 file (including BEGIN/END PRIVATE KEY
   header/footer) and set it as the APNS_KEY secret in Replit Secrets.
3. Set APNS_KEY_ID to the 10-character Key ID shown on the developer portal.
4. Set APNS_TEAM_ID to the 10-character Team ID from your Apple Developer account.
5. Optionally set APNS_BUNDLE_ID (defaults to com.liveswell.app) and
   APNS_SANDBOX=true for TestFlight / sandbox builds.
6. Redeploy the application for the changes to take effect.

Missing variable(s): ${result.missing.join(', ')}

This alert was generated automatically at ${new Date().toISOString()}.

— LiveSwell monitoring`;

  const html = `
<p><strong>LiveSwell APNs health check <span style="color:#c0392b">FAILED</span>.</strong></p>
<p>iOS users who grant push-notification permission will <strong>not</strong> receive any alerts
until the credentials are configured.</p>
<table cellpadding="4" style="border-collapse:collapse;font-family:monospace">
  <tr><td><b>Reason</b></td><td>${reason}</td></tr>
  <tr><td><b>Missing variables</b></td><td>${result.missing.join(', ')}</td></tr>
</table>

<h3>How to fix</h3>
<ol>
  <li>Go to <a href="https://developer.apple.com">developer.apple.com</a> → <em>Certificates, Identifiers &amp; Profiles</em> →
      <em>Keys</em> → create (or download) an APNs key (<code>.p8</code> file).</li>
  <li>Copy the full contents of the <code>.p8</code> file (including <code>-----BEGIN PRIVATE KEY-----</code> header/footer)
      and set it as the <code>APNS_KEY</code> secret in <strong>Replit Secrets</strong>.</li>
  <li>Set <code>APNS_KEY_ID</code> to the 10-character Key ID shown on the developer portal.</li>
  <li>Set <code>APNS_TEAM_ID</code> to the 10-character Team ID from your Apple Developer account.</li>
  <li>Optionally set <code>APNS_BUNDLE_ID</code> (defaults to <code>com.liveswell.app</code>) and
      <code>APNS_SANDBOX=true</code> for TestFlight / sandbox builds.</li>
  <li>Redeploy the application for the changes to take effect.</li>
</ol>

<p style="color:#888;font-size:0.85em">
  Generated automatically at ${new Date().toISOString()}<br>
  — LiveSwell monitoring
</p>`;

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy('resend', '/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: alertEmail,
        subject,
        text,
        html,
      }),
    });

    if (response.ok) {
      console.log(`[push-health-monitor] APNs alert sent to ${alertEmail}`);
    } else {
      const body = await response.text();
      console.error(`[push-health-monitor] Failed to send APNs alert: ${body}`);
    }
  } catch (err) {
    console.error('[push-health-monitor] Error sending APNs alert email:', err);
  }
}

/**
 * Run an APNs credential health check at startup.
 * Logs the result and emails the admin when credentials are absent, subject
 * to a 24-hour cooldown (same recovered → failed bypass as the VAPID check).
 */
export async function runApnsHealthCheck(
  context: 'startup' | 'scheduled' = 'startup'
): Promise<ApnsHealthResult> {
  console.log(`[push-health-monitor] Running APNs health check (${context})…`);

  const result = checkApnsHealth();

  if (result.ok) {
    console.log('[push-health-monitor] ✅ APNs credentials present — native iOS push enabled');
    // Update stored state to reflect healthy status (enables recovery detection)
    await evaluateAndSendAlert('apns', true, async () => {});
  } else {
    console.warn(`[push-health-monitor] ⚠️ APNs disabled: ${result.reason}`);
    // Only email in production to avoid noise during the normal dev cycle
    // where APNs credentials are deliberately absent.
    if (process.env.NODE_ENV === 'production') {
      await evaluateAndSendAlert('apns', false, () => sendApnsAdminAlert(result));
    }
  }

  return result;
}

// --------------------------------------------------------------------------
// Cooldown helpers (24-hour per-key deduplication)
// --------------------------------------------------------------------------

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Decide whether an alert email should be sent for `alertKey`.
 *
 * Returns true (send) when:
 * - The previous check was healthy (recovered → failed transition), OR
 * - More than 24 hours have passed since the last alert email.
 *
 * Returns false (suppress) when the same failure has already been reported
 * within the last 24 hours.
 *
 * Also persists the updated state (lastWasOk, lastAlertedAt) to the DB so
 * the cooldown survives server restarts.
 *
 * @param alertKey  Logical key, e.g. 'vapid' or 'apns'
 * @param isOk      Whether the current check passed
 * @param sendEmail Function that actually dispatches the email
 */
async function evaluateAndSendAlert(
  alertKey: string,
  isOk: boolean,
  sendEmail: () => Promise<void>
): Promise<void> {
  // ── 1. Load existing state ──────────────────────────────────────────────
  let state: { lastAlertedAt: Date | null; lastWasOk: boolean } = {
    lastAlertedAt: null,
    lastWasOk: true,
  };

  let dbAvailable = true;
  try {
    const rows = await db
      .select()
      .from(pushHealthAlertState)
      .where(eq(pushHealthAlertState.alertKey, alertKey))
      .limit(1);

    if (rows.length > 0) {
      state = { lastAlertedAt: rows[0].lastAlertedAt, lastWasOk: rows[0].lastWasOk };
    }
  } catch (err) {
    dbAvailable = false;
    // Table missing or DB unreachable — log prominently so it is not invisible.
    // We fall back to always-send so alerts are never silently lost, but this
    // means the cooldown is not enforced until the table exists.
    console.warn(
      `[push-health-monitor] WARNING: push_health_alert_state table unavailable for key '${alertKey}' — cooldown not enforced, will send every check. Run post-merge.sh to create the table. Error:`,
      err instanceof Error ? err.message : err
    );
  }

  // ── 2. Persist the latest health status (lastWasOk) ───────────────────
  const now = new Date();

  if (dbAvailable) {
    try {
      await db
        .insert(pushHealthAlertState)
        .values({
          alertKey,
          lastAlertedAt: state.lastAlertedAt,
          lastWasOk: isOk,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: pushHealthAlertState.alertKey,
          set: { lastWasOk: isOk, updatedAt: now },
        });
    } catch (err) {
      console.error(`[push-health-monitor] Could not persist alert state for '${alertKey}':`, err);
    }
  }

  // ── 3. If healthy, nothing to send ─────────────────────────────────────
  if (isOk) return;

  // ── 4. Decide whether to send ──────────────────────────────────────────
  const recoveredToFailed = state.lastWasOk; // previous check was ok
  const withinCooldown =
    dbAvailable &&                            // can't enforce cooldown without DB
    state.lastAlertedAt !== null &&
    now.getTime() - state.lastAlertedAt.getTime() < ALERT_COOLDOWN_MS;

  if (!recoveredToFailed && withinCooldown) {
    const hoursAgo = state.lastAlertedAt
      ? ((now.getTime() - state.lastAlertedAt.getTime()) / 3_600_000).toFixed(1)
      : '?';
    console.log(
      `[push-health-monitor] Suppressing '${alertKey}' alert — already sent ${hoursAgo}h ago (cooldown 24h)`
    );
    return;
  }

  if (recoveredToFailed) {
    console.log(
      `[push-health-monitor] '${alertKey}' transitioned from healthy → failed; bypassing cooldown`
    );
  }

  // ── 5. Send and record timestamp ───────────────────────────────────────
  await sendEmail();

  if (dbAvailable) {
    try {
      await db
        .insert(pushHealthAlertState)
        .values({
          alertKey,
          lastAlertedAt: now,
          lastWasOk: false,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: pushHealthAlertState.alertKey,
          set: { lastAlertedAt: now, lastWasOk: false, updatedAt: now },
        });
    } catch (err) {
      console.error(`[push-health-monitor] Could not update lastAlertedAt for '${alertKey}':`, err);
    }
  }
}

// --------------------------------------------------------------------------
// Exported entry point (VAPID / web-push)
// --------------------------------------------------------------------------

/**
 * Run a push notification health check.
 *
 * - Logs the result.
 * - If unhealthy/degraded, sends an admin alert email subject to a 24-hour
 *   cooldown per failure type.  A recovered → failed transition always sends
 *   a fresh alert regardless of cooldown.
 * - Returns the health result so callers can act on it if needed.
 *
 * Safe to call before push-service is fully initialised (e.g. as a preflight
 * in index.ts) — step 4 of checkPushHealth() gracefully skips the service
 * singleton check when the module hasn't been imported yet.
 */
export async function runPushHealthCheck(
  context: 'startup' | 'scheduled' = 'scheduled'
): Promise<PushHealthResult> {
  console.log(`[push-health-monitor] Running push health check (${context})…`);

  const result = checkPushHealth();

  if (result.ok) {
    console.log(
      '[push-health-monitor] ✅ Push notifications healthy — VAPID keys present and valid'
    );
    // Update stored state to reflect healthy status (enables recovery detection)
    await evaluateAndSendAlert('vapid', true, async () => {});
  } else {
    console.error(
      `[push-health-monitor] ❌ Push notifications ${result.pushServiceStatus}: ${result.reason}`
    );
    await evaluateAndSendAlert('vapid', false, () => sendAdminAlert(result));
  }

  return result;
}
