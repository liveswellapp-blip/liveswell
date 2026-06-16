import { Resend } from 'resend';
import { storage } from './storage';
import { fetchWeatherData } from './weather-service';
import type { Location } from '@shared/schema';
import { generateNotificationSummary } from './ai-service';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('⚠️  RESEND_API_KEY not configured — email notifications will be disabled');
} else {
  console.log('✅ Resend email service configured');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'LiveSwell <onboarding@resend.dev>';
console.log(`📧 Email from-address: ${FROM_EMAIL}${process.env.RESEND_FROM_EMAIL ? '' : ' (set RESEND_FROM_EMAIL secret to use a verified domain)'}`);

export class EmailService {
  static isConfigured(): boolean {
    return resend !== null;
  }

  static async sendDailyConditions(toEmail: string, locationId: number): Promise<boolean> {
    if (!resend) {
      console.error('Resend not configured — cannot send email');
      return false;
    }

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

      // Try AI summary (non-blocking, 3s timeout)
      let aiSentence: string | null = null;
      try {
        aiSentence = await Promise.race([
          generateNotificationSummary(locationId, 'daily'),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch { /* fall through */ }

      const subject = `🌊 ${location.name} Surf Report — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

      const aiBlock = aiSentence ? `\n${aiSentence}\n` : '';

      const text = `🌊 ${location.name} Surf Report${aiBlock}
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
LiveSwell · Manage alerts at liveswell.app`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <tr><td>
      <div style="background:linear-gradient(160deg,#030912 0%,#091a35 100%);border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${aiSentence ? '12px' : '20px'};">
          <span style="font-size:24px;">🌊</span>
          <div>
            <div style="font-size:18px;font-weight:900;color:#fff;">${location.name}</div>
            <div style="font-size:12px;color:#64748b;">Surf Report · ${timestamp}</div>
          </div>
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
      <div style="text-align:center;font-size:11px;color:#334155;">
        LiveSwell · <a href="https://liveswell.app" style="color:#10b981;text-decoration:none;">Manage your alerts</a>
      </div>
    </td></tr>
  </table>
</body>
</html>`;

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error(`❌ Resend email error: ${result.error.message}`);
        return false;
      }

      console.log(`✅ Email sent to ${toEmail} for ${location.name} (id: ${result.data?.id})`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  static async sendConditionAlert(
    toEmail: string,
    locationName: string,
    triggerReason: string,
    locationId: number,
  ): Promise<boolean> {
    if (!resend) {
      console.error('Resend not configured — cannot send condition alert email');
      return false;
    }

    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const subject = `🚨 Surf Alert: ${triggerReason} at ${locationName}`;

      const text = `🌊 LiveSwell Condition Alert

${triggerReason} at ${locationName}
Triggered at: ${timestamp}

Open the app to see full conditions.

—
LiveSwell · Manage alerts at liveswell.app`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <tr><td>
      <div style="background:linear-gradient(160deg,#030912 0%,#0f1e35 100%);border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span style="font-size:28px;">🚨</span>
          <div>
            <div style="font-size:18px;font-weight:900;color:#fff;">Surf Alert Triggered</div>
            <div style="font-size:12px;color:#64748b;">${locationName} · ${timestamp}</div>
          </div>
        </div>
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#fbbf24;">${triggerReason}</div>
        </div>
        <a href="https://liveswell.app" style="display:block;text-align:center;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;font-weight:700;">View Full Conditions</a>
      </div>
      <div style="text-align:center;font-size:11px;color:#334155;">
        LiveSwell · <a href="https://liveswell.app" style="color:#10b981;text-decoration:none;">Manage your alerts</a>
      </div>
    </td></tr>
  </table>
</body>
</html>`;

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error(`❌ Resend condition alert error: ${result.error.message}`);
        return false;
      }

      console.log(`✅ Condition alert email sent to ${toEmail} (id: ${result.data?.id})`);
      return true;
    } catch (error) {
      console.error('Error sending condition alert email:', error);
      return false;
    }
  }
}
