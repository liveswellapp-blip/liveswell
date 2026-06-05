/**
 * ConditionMonitor — checks active condition-based alerts every 20 minutes.
 * Evaluates swell, wind, and tide thresholds against live data and fires
 * delivery channels (push / SMS / email) when conditions are met.
 * Respects a per-alert cooldown to prevent repeated firing.
 */
import * as cron from 'node-cron';
import { storage } from './storage';
import { SMSService } from './sms-service';
import { EmailService } from './email-service';
import { pushNotificationService } from './push-service';
import { fetchWeatherData } from './weather-service';

// ─── Threshold types ─────────────────────────────────────────────────────────
export interface SwellThresholds {
  minWaveHeight: number;        // ft
  minPeriod?: number;           // sec, optional
}

export interface WindThresholds {
  threshold: number;            // mph
  triggerWhen: 'above' | 'below';
  directionFilter: 'any' | 'onshore' | 'offshore' | 'sideshore';
}

export interface TideThresholds {
  tideType: 'high' | 'low';
  windowMinutes: number;
}

export type AlertThresholds = SwellThresholds | WindThresholds | TideThresholds;

// ─── Wind-type classifier (mirrors routes.ts getWindType) ────────────────────
function getWindType(lat: number, lon: number, windDir: string): string {
  const dir = windDir.toUpperCase();
  if (lon > -85 && lon < -65 && lat > 25 && lat < 45) {
    if (['E', 'ENE', 'ESE'].includes(dir)) return 'onshore';
    if (['W', 'WNW', 'WSW'].includes(dir)) return 'offshore';
    if (['NE', 'SE'].includes(dir)) return 'sideshore';
    if (['NW', 'SW'].includes(dir)) return 'sideshore';
    return 'sideshore';
  }
  if (lon > -125 && lon < -117 && lat > 32 && lat < 48) {
    if (['W', 'WNW', 'WSW'].includes(dir)) return 'onshore';
    if (['E', 'ENE', 'ESE'].includes(dir)) return 'offshore';
    if (['NW', 'SW'].includes(dir)) return 'sideshore';
    if (['NE', 'SE'].includes(dir)) return 'sideshore';
    return 'sideshore';
  }
  if (lon > -98 && lon < -80 && lat > 25 && lat < 31) {
    if (['S', 'SSE', 'SSW', 'SE', 'SW'].includes(dir)) return 'onshore';
    if (['N', 'NNE', 'NNW', 'NE', 'NW'].includes(dir)) return 'offshore';
    return 'sideshore';
  }
  return 'offshore';
}

// ─── Pure threshold evaluators ───────────────────────────────────────────────

export function evaluateSwellAlert(weatherData: any, t: SwellThresholds): boolean {
  const waveHeight = parseFloat(String(weatherData.waveHeight ?? 0));
  const wavePeriod = Number(weatherData.wavePeriod ?? 0);
  if (waveHeight < t.minWaveHeight) return false;
  if (t.minPeriod && t.minPeriod > 0 && wavePeriod < t.minPeriod) return false;
  return true;
}

export function evaluateWindAlert(
  weatherData: any,
  t: WindThresholds,
  lat: number,
  lon: number,
): boolean {
  const windSpeed = parseFloat(String(weatherData.windSpeed ?? 0));
  const triggered =
    t.triggerWhen === 'below' ? windSpeed <= t.threshold : windSpeed >= t.threshold;
  if (!triggered) return false;

  if (t.directionFilter !== 'any' && weatherData.windDirection) {
    const windType = getWindType(lat, lon, String(weatherData.windDirection));
    if (windType !== t.directionFilter) return false;
  }
  return true;
}

/**
 * Evaluates tide alerts using absolute timestamps.
 *
 * Prefers `tide.isoRaw` ("YYYY-MM-DD HH:MM" in station local time, from NOAA lst_ldt),
 * which includes the full date — correctly handling next-day tides (e.g. "01:30 AM
 * tomorrow") without collapsing them to today's date.
 *
 * UTC conversion uses a longitude-derived offset (accurate to ±1h including DST for all
 * US coastal locations). Falls back to the display-time string when isoRaw is absent
 * (e.g. generated/fallback tide data), using today's date in that timezone.
 */
export function evaluateTideAlert(
  weatherData: any,
  t: TideThresholds,
  lon: number,
): boolean {
  const tides: Array<{ time: string; height: string; isoRaw?: string }> =
    t.tideType === 'high' ? (weatherData.tideHigh ?? []) : (weatherData.tideLow ?? []);

  const now = Date.now();
  const windowMs = t.windowMinutes * 60 * 1000;

  // Approximate UTC offset from longitude — accurate for all US coastal surf spots
  const utcOffsetHours = Math.round(lon / 15);

  for (const tide of tides) {
    try {
      let tideDateMs: number;

      if (tide.isoRaw) {
        // Parse "YYYY-MM-DD HH:MM" in station local time → UTC
        // Using isoRaw preserves the full date, so next-day tides are handled correctly.
        const m = tide.isoRaw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
        if (!m) continue;
        const [, yr, mo, dy, hh, mm] = m.map(Number);
        // local → UTC: subtract the UTC offset
        tideDateMs = Date.UTC(yr, mo - 1, dy, hh - utcOffsetHours, mm);
      } else {
        // Fallback: parse display string "h:mm AM/PM" and use today in the location TZ
        const fm = tide.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!fm) continue;
        let h = parseInt(fm[1]);
        const mm = parseInt(fm[2]);
        const ampm = fm[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        else if (ampm === 'AM' && h === 12) h = 0;
        // "Today" in the location's approximate local timezone
        const locationNow = new Date(now + utcOffsetHours * 3_600_000);
        tideDateMs = Date.UTC(
          locationNow.getUTCFullYear(), locationNow.getUTCMonth(), locationNow.getUTCDate(),
          h - utcOffsetHours, mm,
        );
      }

      const diff = tideDateMs - now;
      // Fire if tide is approaching (within window) or just passed (within 5 min)
      if (diff >= -5 * 60_000 && diff <= windowMs) return true;
    } catch { /* ignore parse errors */ }
  }
  return false;
}

// ─── Human-readable trigger reason ───────────────────────────────────────────
function buildTriggerReason(alertType: string, thresholds: any, weatherData: any): string {
  if (alertType === 'swell') {
    const t = thresholds as SwellThresholds;
    const wh = parseFloat(String(weatherData.waveHeight ?? 0)).toFixed(1);
    const period = t.minPeriod && t.minPeriod > 0
      ? ` at ${weatherData.wavePeriod}s period (min: ${t.minPeriod}s)`
      : '';
    return `Waves are now ${wh}ft (threshold: ${t.minWaveHeight}ft+)${period}`;
  }
  if (alertType === 'wind') {
    const t = thresholds as WindThresholds;
    const ws = parseFloat(String(weatherData.windSpeed ?? 0)).toFixed(0);
    const dir = t.directionFilter !== 'any' ? ` · ${t.directionFilter} wind` : '';
    return `Wind is ${ws} mph (${t.triggerWhen} ${t.threshold} mph)${dir}`;
  }
  if (alertType === 'tide') {
    const t = thresholds as TideThresholds;
    return `${t.tideType === 'high' ? 'High' : 'Low'} tide within ${t.windowMinutes} min`;
  }
  return 'Conditions met your alert threshold';
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
/**
 * Dispatches a condition alert across all configured channels.
 * Returns true if at least one channel delivered successfully.
 */
async function dispatchConditionAlert(
  alert: any,
  weatherData: any,
  locationName: string,
  triggerReason: string,
): Promise<boolean> {
  const channels: string[] = alert.deliveryChannels ?? [];
  const promises: Promise<boolean>[] = [];

  if (channels.includes('sms') && alert.phoneNumber) {
    console.log(`📱 Condition SMS → ${alert.phoneNumber} (${locationName}): ${triggerReason}`);
    promises.push(
      SMSService.sendConditionAlert(alert.phoneNumber, locationName, triggerReason, alert.locationId)
        .then(ok => { console.log(ok ? '✅ SMS sent' : '❌ SMS failed'); return ok; })
        .catch(() => false),
    );
  }

  if (channels.includes('email') && alert.userEmail) {
    console.log(`✉️  Condition email → ${alert.userEmail} (${locationName}): ${triggerReason}`);
    promises.push(
      EmailService.sendConditionAlert(alert.userEmail, locationName, triggerReason, alert.locationId)
        .then(ok => { console.log(ok ? '✅ Email sent' : '❌ Email failed'); return ok; })
        .catch(() => false),
    );
  }

  if (channels.includes('push')) {
    console.log(`🔔 Condition push → user ${alert.userId} (${locationName}): ${triggerReason}`);
    promises.push(
      pushNotificationService.sendCustomNotification(
        alert.userId,
        `🌊 ${locationName} Alert`,
        triggerReason,
      ).then(ok => { console.log(ok ? '✅ Push sent' : '❌ Push failed'); return ok; })
        .catch(() => false),
    );
  }

  if (promises.length === 0) return false;
  const results = await Promise.all(promises);
  return results.some(ok => ok);
}

// ─── ConditionMonitor ────────────────────────────────────────────────────────
export class ConditionMonitor {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    // Run immediately on startup, then every 20 minutes
    await this.checkConditionAlerts();
    cron.schedule('*/20 * * * *', () => this.checkConditionAlerts());
    this.initialized = true;
    console.log('🌊 Condition monitor initialized (runs every 20 min)');
  }

  static async checkConditionAlerts(): Promise<void> {
    try {
      const conditionAlerts = await storage.getActiveConditionAlerts();
      if (conditionAlerts.length === 0) return;

      console.log(`🔍 Checking ${conditionAlerts.length} condition alert(s)…`);

      // Group by locationId — fetch weather data once per unique location
      const byLocation = new Map<number, typeof conditionAlerts>();
      for (const a of conditionAlerts) {
        const list = byLocation.get(a.locationId) ?? [];
        list.push(a);
        byLocation.set(a.locationId, list);
      }

      for (const [locationId, alerts] of byLocation) {
        const location = await storage.getLocation(locationId);
        if (!location) continue;

        let weatherData: any;
        try {
          weatherData = await fetchWeatherData(
            parseFloat(location.latitude),
            parseFloat(location.longitude),
          );
        } catch (err) {
          console.error(`Failed to fetch weather for location ${locationId}:`, err);
          continue;
        }
        if (!weatherData) continue;

        const lat = parseFloat(location.latitude);
        const lon = parseFloat(location.longitude);

        for (const alert of alerts) {
          // Cooldown check
          if (alert.lastFiredAt) {
            const cooldownMs = (alert.cooldownHours ?? 4) * 60 * 60 * 1000;
            if (Date.now() - new Date(alert.lastFiredAt).getTime() < cooldownMs) {
              continue;
            }
          }

          const thresholds: any = alert.thresholds ?? {};
          let triggered = false;

          if (alert.alertType === 'swell') {
            triggered = evaluateSwellAlert(weatherData, thresholds as SwellThresholds);
          } else if (alert.alertType === 'wind') {
            triggered = evaluateWindAlert(weatherData, thresholds as WindThresholds, lat, lon);
          } else if (alert.alertType === 'tide') {
            triggered = evaluateTideAlert(weatherData, thresholds as TideThresholds, lon);
          }

          if (!triggered) continue;

          const triggerReason = buildTriggerReason(alert.alertType, thresholds, weatherData);
          console.log(`🚨 Alert triggered: ${alert.alertType} for ${location.name} — ${triggerReason}`);

          const delivered = await dispatchConditionAlert(alert, weatherData, location.name, triggerReason);
          // Only mark lastFiredAt when at least one channel delivered, so a delivery
          // failure doesn't silently burn the cooldown window.
          if (delivered) {
            await storage.updateAlertLastFiredAt(alert.id, new Date());
          } else {
            console.warn(`⚠️ Alert ${alert.id} triggered but no channel delivered — cooldown NOT advanced`);
          }
        }
      }
    } catch (error) {
      console.error('Error in ConditionMonitor:', error);
    }
  }
}
