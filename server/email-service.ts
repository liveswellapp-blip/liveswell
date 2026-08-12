import { ReplitConnectors } from '@replit/connectors-sdk';
import { storage } from './storage';
import { fetchWeatherData, getQuotaExceededAt } from './weather-service';
import type { Location } from '@shared/schema';
import { generateNotificationSummary } from './ai-service';
import { createUnsubscribeToken } from './unsubscribe-token';

const APP_BASE_URL = 'https://liveswell.app';

// ─── Session quality rater ────────────────────────────────────────────────────
/**
 * Rates surf session quality based on wave height, period, and wind speed.
 * Returns a label, hex colour, and emoji for use in email templates.
 *
 * Good  — waves ≥ 3 ft AND period ≥ 10 s AND wind < 15 mph
 * Fair  — waves ≥ 2 ft AND wind < 25 mph
 * Poor  — anything else (small, blown-out, or combo)
 */
function rateSession(
  waveHeightFt: number,
  wavePeriodSec: number,
  windSpeedMph: number,
): { label: 'Good' | 'Fair' | 'Poor'; color: string; bg: string; emoji: string } {
  if (waveHeightFt >= 3 && wavePeriodSec >= 10 && windSpeedMph < 15) {
    return { label: 'Good', color: '#10b981', bg: 'rgba(16,185,129,0.12)', emoji: '✅' };
  }
  if (waveHeightFt >= 2 && windSpeedMph < 25) {
    return { label: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '〜' };
  }
  return { label: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', emoji: '⚠️' };
}

const FALLBACK_FROM = 'LiveSwell <onboarding@resend.dev>';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || FALLBACK_FROM;

if (process.env.RESEND_FROM_EMAIL) {
  console.log(`📧 Email from-address: ${FROM_EMAIL} (verified domain)`);
} else {
  console.warn(
    `⚠️  RESEND_FROM_EMAIL is not set — falling back to shared test address "${FALLBACK_FROM}". ` +
    `Emails may be rejected or spam-filtered in production. ` +
    `Set the RESEND_FROM_EMAIL secret to a verified Resend domain address.`,
  );
}
console.log('✅ Resend email service configured via Replit Connectors');

async function sendEmail(
  payload: { from: string; to: string; subject: string; text: string; html: string; headers?: Record<string, string> },
  retries = 2,
): Promise<{ id?: string; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy('resend', '/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Transient server-side errors (5xx) — wait briefly and retry
    if (!response.ok) {
      const body = await response.text();
      if (response.status >= 500 && attempt < retries) {
        console.warn(`⚠️  Resend transient error (${response.status}) on attempt ${attempt}/${retries} — retrying…`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        lastError = body;
        continue;
      }
      return { error: body };
    }

    const data = await response.json() as { id?: string; statusCode?: number; message?: string; name?: string };
    if (data.statusCode && data.statusCode >= 400) {
      return { error: data.message ?? JSON.stringify(data) };
    }
    return { id: data.id };
  }

  return { error: lastError ?? 'Unknown error after retries' };
}

export class EmailService {
  static isConfigured(): boolean {
    return true;
  }

  /**
   * Lightweight startup health-check: calls GET /domains on the Resend connector
   * to verify the connector proxy is reachable and the API key is valid.
   * Returns true when the connector responds with a 2xx, false otherwise.
   * Logs the outcome so it appears alongside the SMS / push checks at startup.
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const connectors = new ReplitConnectors();
      const response = await connectors.proxy('resend', '/domains', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        console.log('✅ Email (Resend) connector healthy — delivery is operational');
        return true;
      }

      const body = await response.text().catch(() => '(unreadable)');
      console.error(`❌ Email (Resend) connector health-check failed (HTTP ${response.status}): ${body}`);
      return false;
    } catch (err) {
      console.error('❌ Email (Resend) connector health-check threw an error:', err);
      return false;
    }
  }

  static async sendDailyConditions(toEmail: string, locationId: number, alertId?: number): Promise<boolean> {
    try {
      const location = await storage.getLocation(locationId);
      if (!location) {
        console.error(`Location ${locationId} not found for email`);
        return false;
      }

      const weatherData = await fetchWeatherData(
        parseFloat(location.latitude),
        parseFloat(location.longitude)
      );
      if (!weatherData) {
        console.error(`No weather data for location ${locationId}`);
        return false;
      }

      // Refuse to send fabricated demo data when the OpenWeather quota is exhausted.
      // Two checks:
      //   1. (weatherData as any).quotaExceeded — set when THIS call hit a 429 (any of the
      //      three OWM sub-requests: current, forecast, UV).
      //   2. getQuotaExceededAt() — set by a previous call this session; catches cases where
      //      the 18-min cache returns unflagged data that was fetched before the quota was hit.
      if ((weatherData as any).quotaExceeded || getQuotaExceededAt()) {
        console.warn(
          `⚠️ Email daily conditions for ${location.name} (${locationId}) suppressed` +
          ` — OpenWeather quota exceeded; data is fabricated demo values.` +
          ` Delivery will resume once the quota resets (midnight UTC).`
        );
        return false;
      }

      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const highTides = (weatherData.tideHigh || [])
        .map((t: any) => `${t.time} (${t.height}ft)`)
        .join(', ') || 'N/A';
      const lowTides = (weatherData.tideLow || [])
        .map((t: any) => `${t.time} (${t.height}ft)`)
        .join(', ') || 'N/A';

      const uvIndex = weatherData.uvIndex || 0;
      const uvDesc = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

      // Session quality rating
      const sessionRating = rateSession(
        parseFloat(String(weatherData.waveHeight ?? 0)),
        Number(weatherData.wavePeriod ?? 0),
        parseFloat(String(weatherData.windSpeed ?? 0)),
      );

      // Try AI summary (non-blocking, 3s timeout)
      let aiSentence: string | null = null;
      try {
        aiSentence = await Promise.race([
          generateNotificationSummary(locationId, 'daily'),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch { /* fall through */ }

      const subject = `🌊 ${location.name} Surf Report — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

      // Build unsubscribe URL + headers before constructing HTML so the footer
      // is injected directly — avoids a brittle post-hoc string replacement.
      const unsubscribeUrl = alertId
        ? `${APP_BASE_URL}/api/unsubscribe?token=${createUnsubscribeToken(alertId, toEmail)}`
        : null;

      const extraHeaders: Record<string, string> = {};
      if (unsubscribeUrl) {
        extraHeaders['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
        extraHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }

      const footerTextLine = unsubscribeUrl
        ? `LiveSwell · Manage alerts at liveswell.app\nUnsubscribe: ${unsubscribeUrl}`
        : `LiveSwell · Manage alerts at liveswell.app`;

      const footerHtml = `<div style="text-align:center;font-size:11px;color:#334155;">
        LiveSwell · <a href="${APP_BASE_URL}" style="color:#10b981;text-decoration:none;">Manage your alerts</a>${
          unsubscribeUrl
            ? ` · <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>`
            : ''
        }
      </div>`;

      const aiBlock = aiSentence ? `\n${aiSentence}\n` : '';

      const text = `🌊 ${location.name} Surf Report${aiBlock}
Session: ${sessionRating.emoji} ${sessionRating.label}
Updated: ${timestamp}

━━━━━━━━━━━━━━━━━━━━
WAVES
━━━━━━━━━━━━━━━━━━━━
Height: ${weatherData.waveHeight}ft
Period: ${weatherData.wavePeriod}s
Direction: ${weatherData.waveDirection}

━━━━━━━━━━━━━━━━━━━━
WIND
━━━━━━━━━━━━━━━━━━━━
Speed: ${weatherData.windSpeed} mph ${weatherData.windDirection}
Gusts: ${Math.round(parseFloat(String(weatherData.windSpeed)) * 1.3)} mph
Water Temp: ${Math.round(parseFloat(String(weatherData.waterTemp)))}°F

━━━━━━━━━━━━━━━━━━━━
TIDES
━━━━━━━━━━━━━━━━━━━━
High: ${highTides}
Low:  ${lowTides}

━━━━━━━━━━━━━━━━━━━━
SUN & UV
━━━━━━━━━━━━━━━━━━━━
Sunrise: ${weatherData.sunrise}
Sunset:  ${weatherData.sunset}
UV Index: ${uvIndex} (${uvDesc})

—
${footerTextLine}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <tr><td>
      <div style="background:linear-gradient(160deg,#030912 0%,#091a35 100%);border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span style="font-size:24px;">🌊</span>
          <div>
            <div style="font-size:18px;font-weight:900;color:#fff;">${location.name}</div>
            <div style="font-size:12px;color:#64748b;">Surf Report · ${timestamp}</div>
          </div>
          <span style="margin-left:auto;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;letter-spacing:0.05em;background:${sessionRating.bg};color:${sessionRating.color};border:1px solid ${sessionRating.color}40;">${sessionRating.emoji} ${sessionRating.label}</span>
        </div>

        ${aiSentence ? `<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:10px;padding:12px 14px;margin-bottom:16px;">
          <span style="font-size:9px;color:#10b981;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.7;">✦ AI</span>
          <div style="font-size:13px;color:#cbd5e1;margin-top:4px;line-height:1.5;">${aiSentence}</div>
        </div>` : ''}

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;width:48%;">
              <div style="font-size:10px;color:#10b981;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Waves</div>
              <div style="font-size:28px;font-weight:900;color:#10b981;">${weatherData.waveHeight}<span style="font-size:14px;font-weight:600;">ft</span></div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${weatherData.wavePeriod}s · ${weatherData.waveDirection}</div>
            </td>
            <td width="4%"></td>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;width:48%;">
              <div style="font-size:10px;color:#38bdf8;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Wind</div>
              <div style="font-size:28px;font-weight:900;color:#38bdf8;">${weatherData.windSpeed}<span style="font-size:14px;font-weight:600;">mph</span></div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${weatherData.windDirection} · ${Math.round(parseFloat(String(weatherData.waterTemp)))}°F water</div>
            </td>
          </tr>
        </table>

        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="font-size:10px;color:#f59e0b;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Tides</div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.8;">
            <strong style="color:#e2e8f0;">High:</strong> ${highTides}<br>
            <strong style="color:#e2e8f0;">Low:</strong> ${lowTides}
          </div>
        </div>

        <div style="display:flex;gap:8px;font-size:11px;color:#64748b;">
          <span>☀️ ${weatherData.sunrise}</span>
          <span>·</span>
          <span>🌅 ${weatherData.sunset}</span>
          <span>·</span>
          <span>UV ${uvIndex} (${uvDesc})</span>
        </div>
      </div>
      ${footerHtml}
    </td></tr>
  </table>
</body>
</html>`;

      const result = await sendEmail({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
        ...(Object.keys(extraHeaders).length ? { headers: extraHeaders } : {}),
      });

      if (result.error) {
        console.error(`❌ Resend email error: ${result.error}`);
        return false;
      }

      console.log(`✅ Email sent to ${toEmail} for ${location.name} (id: ${result.id})`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  static async sendSmsDisabledNotification(
    toEmail: string,
    alertLabel: string,
    locationName: string,
    phoneNumber: string,
  ): Promise<boolean> {
    try {
      const subject = `📵 SMS paused on your "${alertLabel}" alert`;

      const text = `Hi,

Your phone number ${phoneNumber} wasn't verified within 24 hours, so SMS delivery has been automatically paused on your "${alertLabel}" alert for ${locationName}.

Your alert is still active and will continue delivering via any other channels you set up (email, push). SMS will resume as soon as you verify your number.

To re-enable SMS:
1. Open LiveSwell and go to Alerts
2. Edit the "${alertLabel}" alert
3. Verify your phone number

—
LiveSwell · Manage alerts at liveswell.app`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <tr><td>
      <div style="background:linear-gradient(160deg,#030912 0%,#0f1e35 100%);border:1px solid rgba(239,68,68,0.25);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span style="font-size:28px;">📵</span>
          <div>
            <div style="font-size:18px;font-weight:900;color:#fff;">SMS Paused</div>
            <div style="font-size:12px;color:#64748b;">${locationName} · ${alertLabel}</div>
          </div>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;color:#fca5a5;line-height:1.6;">
            Your number <strong style="color:#f87171;">${phoneNumber}</strong> wasn't verified within 24 hours, so SMS delivery has been automatically paused on this alert.
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="font-size:11px;color:#94a3b8;line-height:1.8;">
            Your alert is still active and will continue delivering via any other channels you set up. SMS resumes as soon as you verify your number.
          </div>
        </div>
        <a href="https://liveswell.app/alerts" style="display:block;text-align:center;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;font-weight:700;">Re-enable SMS →</a>
      </div>
      <div style="text-align:center;font-size:11px;color:#334155;">
        LiveSwell · <a href="https://liveswell.app" style="color:#10b981;text-decoration:none;">Manage your alerts</a>
      </div>
    </td></tr>
  </table>
</body>
</html>`;

      const result = await sendEmail({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error(`❌ Resend SMS-disabled email error: ${result.error}`);
        return false;
      }

      console.log(`✅ SMS-disabled notification sent to ${toEmail} (id: ${result.id})`);
      return true;
    } catch (error) {
      console.error('Error sending SMS-disabled notification:', error);
      return false;
    }
  }

  static async sendConditionAlert(
    toEmail: string,
    locationName: string,
    triggerReason: string,
    locationId: number,
    alertId?: number,
  ): Promise<boolean> {
    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const subject = `🚨 Surf Alert: ${triggerReason} at ${locationName}`;

      // Fetch live conditions to show in the alert email
      let weatherData: any = null;
      try {
        const location = await storage.getLocation(locationId);
        if (location) {
          weatherData = await fetchWeatherData(
            parseFloat(location.latitude),
            parseFloat(location.longitude),
          );
        }
      } catch { /* non-blocking — fall back to trigger-reason-only layout */ }

      const rating = weatherData
        ? rateSession(
            parseFloat(String(weatherData.waveHeight ?? 0)),
            Number(weatherData.wavePeriod ?? 0),
            parseFloat(String(weatherData.windSpeed ?? 0)),
          )
        : null;

      const conditionsText = weatherData
        ? `
━━━━━━━━━━━━━━━━━━━━
CURRENT CONDITIONS
━━━━━━━━━━━━━━━━━━━━
Waves:  ${weatherData.waveHeight}ft · ${weatherData.wavePeriod}s · ${weatherData.waveDirection}
Wind:   ${weatherData.windSpeed} mph ${weatherData.windDirection}
Tide:   ${weatherData.tideStatus ?? 'N/A'}${rating ? `\nSession: ${rating.emoji} ${rating.label}` : ''}
`
        : '';

      // Build unsubscribe URL + headers before constructing HTML so the footer
      // is injected directly — avoids a brittle post-hoc string replacement.
      const unsubscribeUrl = alertId
        ? `${APP_BASE_URL}/api/unsubscribe?token=${createUnsubscribeToken(alertId, toEmail)}`
        : null;

      const extraHeaders: Record<string, string> = {};
      if (unsubscribeUrl) {
        extraHeaders['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
        extraHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }

      const footerTextLine = unsubscribeUrl
        ? `LiveSwell · Manage alerts at liveswell.app\nUnsubscribe: ${unsubscribeUrl}`
        : `LiveSwell · Manage alerts at liveswell.app`;

      const footerHtml = `<div style="text-align:center;font-size:11px;color:#334155;">
        LiveSwell · <a href="${APP_BASE_URL}" style="color:#10b981;text-decoration:none;">Manage your alerts</a>${
          unsubscribeUrl
            ? ` · <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>`
            : ''
        }
      </div>`;

      const text = `🌊 LiveSwell Condition Alert

${triggerReason} at ${locationName}
Triggered at: ${timestamp}
${conditionsText}
Open the app to see the full forecast.

—
${footerTextLine}`;

      const conditionsHtml = weatherData ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;width:48%;">
              <div style="font-size:10px;color:#10b981;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Waves</div>
              <div style="font-size:24px;font-weight:900;color:#10b981;">${weatherData.waveHeight}<span style="font-size:13px;font-weight:600;">ft</span></div>
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${weatherData.wavePeriod}s · ${weatherData.waveDirection}</div>
            </td>
            <td width="4%"></td>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;width:48%;">
              <div style="font-size:10px;color:#38bdf8;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Wind</div>
              <div style="font-size:24px;font-weight:900;color:#38bdf8;">${weatherData.windSpeed}<span style="font-size:13px;font-weight:600;">mph</span></div>
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${weatherData.windDirection} · Tide: ${weatherData.tideStatus ?? 'N/A'}</div>
            </td>
          </tr>
        </table>` : '';

      const ratingHtml = rating
        ? `<span style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;letter-spacing:0.05em;background:${rating.bg};color:${rating.color};border:1px solid ${rating.color}40;">${rating.emoji} ${rating.label}</span>`
        : '';

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <tr><td>
      <div style="background:linear-gradient(160deg,#030912 0%,#0f1e35 100%);border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="font-size:28px;">🚨</span>
          <div style="flex:1;">
            <div style="font-size:18px;font-weight:900;color:#fff;">Surf Alert Triggered</div>
            <div style="font-size:12px;color:#64748b;">${locationName} · ${timestamp}</div>
          </div>
          ${ratingHtml}
        </div>
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#fbbf24;">${triggerReason}</div>
        </div>
        ${conditionsHtml}
        <a href="https://liveswell.app" style="display:block;text-align:center;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;font-weight:700;">View Full Forecast →</a>
      </div>
      ${footerHtml}
    </td></tr>
  </table>
</body>
</html>`;

      const result = await sendEmail({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
        ...(Object.keys(extraHeaders).length ? { headers: extraHeaders } : {}),
      });

      if (result.error) {
        console.error(`❌ Resend condition alert error: ${result.error}`);
        return false;
      }

      console.log(`✅ Condition alert email sent to ${toEmail} (id: ${result.id})`);
      return true;
    } catch (error) {
      console.error('Error sending condition alert email:', error);
      return false;
    }
  }
}
