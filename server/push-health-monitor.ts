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

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'LiveSwell <onboarding@resend.dev>';

export const ADMIN_ALERT_EMAIL =
  process.env.ADMIN_ALERT_EMAIL || 'admin@liveswell.app';

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

async function sendAdminAlert(result: PushHealthResult): Promise<void> {
  const subject = '🚨 LiveSwell — Push notifications may be broken after deploy';
  const reason = result.reason ?? 'Unknown reason';

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
        from: FROM_EMAIL,
        to: ADMIN_ALERT_EMAIL,
        subject,
        text,
        html,
      }),
    });

    if (response.ok) {
      console.log(
        `[push-health-monitor] Admin alert sent to ${ADMIN_ALERT_EMAIL}`
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

async function sendApnsAdminAlert(result: ApnsHealthResult): Promise<void> {
  const subject = '⚠️ LiveSwell — APNs credentials not configured (iOS push disabled)';
  const reason = result.reason ?? 'APNs credentials missing';

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
        from: FROM_EMAIL,
        to: ADMIN_ALERT_EMAIL,
        subject,
        text,
        html,
      }),
    });

    if (response.ok) {
      console.log(`[push-health-monitor] APNs alert sent to ${ADMIN_ALERT_EMAIL}`);
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
 * Logs the result and emails the admin when credentials are absent.
 */
export async function runApnsHealthCheck(
  context: 'startup' | 'scheduled' = 'startup'
): Promise<ApnsHealthResult> {
  console.log(`[push-health-monitor] Running APNs health check (${context})…`);

  const result = checkApnsHealth();

  if (result.ok) {
    console.log('[push-health-monitor] ✅ APNs credentials present — native iOS push enabled');
  } else {
    console.warn(`[push-health-monitor] ⚠️ APNs disabled: ${result.reason}`);
    // Only email at startup to avoid repeat alerts during the normal dev cycle
    // where APNs credentials are deliberately absent.
    if (context === 'startup' && process.env.NODE_ENV === 'production') {
      await sendApnsAdminAlert(result);
    }
  }

  return result;
}

// --------------------------------------------------------------------------
// Exported entry point (VAPID / web-push)
// --------------------------------------------------------------------------

/**
 * Run a push notification health check.
 *
 * - Logs the result.
 * - If unhealthy/degraded, sends an admin alert email.
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
  } else {
    console.error(
      `[push-health-monitor] ❌ Push notifications ${result.pushServiceStatus}: ${result.reason}`
    );
    await sendAdminAlert(result);
  }

  return result;
}
