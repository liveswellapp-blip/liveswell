/**
 * Email (Resend) Health Monitor
 *
 * Mirrors the shape of push-health-monitor so the admin dashboard can display
 * email delivery status the same way it displays push notification status.
 *
 * Because we cannot use Resend itself to send an alert when Resend is down,
 * a failure triggers a Twilio SMS to the admin monitoring number (if the SMS
 * service is configured and ADMIN_ALERT_PHONE is set).
 */

import { EmailService } from './email-service';

export interface EmailHealthResult {
  ok: boolean;
  connectorReachable: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  reason?: string;
  checkedAt: string;
}

// --------------------------------------------------------------------------
// In-memory state (persists for the lifetime of the process)
// --------------------------------------------------------------------------

let _lastResult: EmailHealthResult = {
  ok: false,
  connectorReachable: false,
  status: 'unhealthy',
  reason: 'Not yet checked',
  checkedAt: new Date().toISOString(),
};

/** Returns the cached health result without re-running the check. */
export function checkEmailHealth(): EmailHealthResult {
  return _lastResult;
}

// --------------------------------------------------------------------------
// Live check
// --------------------------------------------------------------------------

export async function runEmailHealthCheck(
  context: 'startup' | 'scheduled' | 'manual' = 'manual',
): Promise<EmailHealthResult> {
  console.log(`[email-health-monitor] Running email health check (${context})…`);

  const healthy = await EmailService.checkHealth();

  const result: EmailHealthResult = {
    ok: healthy,
    connectorReachable: healthy,
    status: healthy ? 'healthy' : 'unhealthy',
    reason: healthy ? undefined : 'Resend connector unreachable — emails will not be delivered until the connector is restored.',
    checkedAt: new Date().toISOString(),
  };

  const wasHealthy = _lastResult.ok;
  _lastResult = result;

  // Newly-failed: try to alert via Twilio SMS since Resend is unavailable.
  if (!healthy && wasHealthy) {
    await sendAdminSmsAlert();
  }

  if (healthy) {
    console.log('[email-health-monitor] ✅ Email (Resend) connector healthy.');
  } else {
    console.error('[email-health-monitor] ❌ Email (Resend) connector unhealthy — admin alerted via SMS if configured.');
  }

  return result;
}

// --------------------------------------------------------------------------
// Fallback admin alert via Twilio SMS
// --------------------------------------------------------------------------

async function sendAdminSmsAlert(): Promise<void> {
  const adminPhone = process.env.ADMIN_ALERT_PHONE;
  if (!adminPhone) {
    console.warn('[email-health-monitor] No ADMIN_ALERT_PHONE configured — skipping SMS alert for Resend failure.');
    return;
  }

  try {
    // Lazy import to avoid circular dependencies
    const { SMSService } = await import('./sms-service') as typeof import('./sms-service');
    await SMSService.sendSMS(
      adminPhone,
      '⚠️ LiveSwell: Email delivery is down. The Resend connector failed its health check at startup. Check the admin dashboard.',
    );
    console.log(`[email-health-monitor] Admin SMS alert sent to ${adminPhone}`);
  } catch (err) {
    console.error('[email-health-monitor] Failed to send admin SMS alert:', err);
  }
}
