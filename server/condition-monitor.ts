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
import { generateNotificationSummary } from './ai-service';

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

// ─── Timezone resolver (lat/lon → IANA tz, covers all US surf spots) ─────────
/**
 * Returns the IANA timezone for a coastal surf location.
 * Mirrors the same regional boundaries used in the wind classifier.
 * Handles DST correctly for all US coasts; international locations fall back to UTC.
 */
function resolveTimezone(lat: number, lon: number): string {
  if (lat > 54 && lon < -130) return 'America/Anchorage';
  if (lon < -140)              return 'Pacific/Honolulu';
  if (lon < -114)              return 'America/Los_Angeles';
  if (lon >= -114 && lon < -100) return 'America/Denver';
  if (lon >= -100 && lon < -85)  return 'America/Chicago';
  if (lon >= -85  && lon < -60 && lat > 24) return 'America/New_York';
  return 'UTC';
}

/**
 * Converts a station-local datetime string ("YYYY-MM-DD HH:MM" in IANA tz)
 * to a UTC timestamp in milliseconds.
 * Uses Intl.DateTimeFormat to compute the exact offset including DST.
 */
function stationLocalToUtcMs(isoRaw: string, timezone: string): number {
  const [datePart, timePart] = isoRaw.split(' ');
  const [yr, mo, dy] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);

  // Treat the local datetime as if it were UTC (our "probe" timestamp)
  const probeUtcMs = Date.UTC(yr, mo - 1, dy, hh, mm);

  // Format that probe UTC moment in the target timezone to find what local clock it shows
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour12: false,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric',
  });
  const parts = fmt.formatToParts(new Date(probeUtcMs));
  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = parseInt(part.value);
  }

  // The local time shown in the target timezone for probeUtcMs
  const shownLocalMs = Date.UTC(p.year, p.month - 1, p.day, (p.hour ?? 0) % 24, p.minute ?? 0);

  // UTC offset at this moment: shownLocalMs - probeUtcMs (e.g. -5h for EST, -4h for EDT)
  const offsetMs = shownLocalMs - probeUtcMs;

  // Correct UTC = probeUtcMs - offsetMs
  return probeUtcMs - offsetMs;
}

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
 * Evaluates tide alerts using DST-correct absolute timestamps.
 *
 * Prefers `tide.isoRaw` ("YYYY-MM-DD HH:MM" in station local time, from NOAA lst_ldt),
 * converted to UTC via `stationLocalToUtcMs` which uses Intl.DateTimeFormat to apply
 * the exact timezone offset at that moment — including DST transitions.
 *
 * Falls back to the display time string + today's date in the resolved timezone when
 * isoRaw is absent (generated/fallback tide data).
 */
export function evaluateTideAlert(
  weatherData: any,
  t: TideThresholds,
  lat: number,
  lon: number,
): boolean {
  const tides: Array<{ time: string; height: string; isoRaw?: string }> =
    t.tideType === 'high' ? (weatherData.tideHigh ?? []) : (weatherData.tideLow ?? []);

  const now = Date.now();
  const windowMs = t.windowMinutes * 60 * 1000;

  // Resolve the IANA timezone for this surf location (handles DST correctly)
  const timezone = resolveTimezone(lat, lon);

  for (const tide of tides) {
    try {
      let tideDateMs: number;

      if (tide.isoRaw) {
        // Preferred path: use the full NOAA datetime including the date component,
        // so next-day tides (e.g. "2026-06-06 01:30") are never confused with today's.
        tideDateMs = stationLocalToUtcMs(tide.isoRaw, timezone);
      } else {
        // Fallback: parse display string "h:mm AM/PM" and anchor to today's date
        // in the resolved IANA timezone.
        const fm = tide.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!fm) continue;
        let h = parseInt(fm[1]);
        const m = parseInt(fm[2]);
        const ampm = fm[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        else if (ampm === 'AM' && h === 12) h = 0;

        // Get today's date string in the location's timezone
        const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
          .format(new Date(now));  // "en-CA" gives "YYYY-MM-DD" format
        const isoFallback = `${localDateStr} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        tideDateMs = stationLocalToUtcMs(isoFallback, timezone);
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
            triggered = evaluateTideAlert(weatherData, thresholds as TideThresholds, lat, lon);
          }

          if (!triggered) continue;

          const triggerReason = buildTriggerReason(alert.alertType, thresholds, weatherData);
          console.log(`🚨 Alert triggered: ${alert.alertType} for ${location.name} — ${triggerReason}`);

          // Try to enrich with an AI-written hook (3s timeout, falls back to triggerReason)
          let aiMessage: string | null = null;
          try {
            aiMessage = await Promise.race([
              generateNotificationSummary(alert.locationId, alert.alertType as 'swell' | 'wind' | 'tide', triggerReason),
              new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
            ]);
          } catch { /* fall through */ }

          const notificationBody = aiMessage ?? triggerReason;

          const delivered = await dispatchConditionAlert(alert, weatherData, location.name, notificationBody);
          // Only mark lastFiredAt when at least one channel delivered, so a delivery
          // failure doesn't silently burn the cooldown window.
          if (delivered) {
            const firedAt = new Date();
            await storage.updateAlertLastFiredAt(alert.id, firedAt);
            // Record the trigger event in the history log
            const snapshot = {
              waveHeight: weatherData.waveHeight,
              wavePeriod: weatherData.wavePeriod,
              windSpeed: weatherData.windSpeed,
              windDirection: weatherData.windDirection,
              tideStatus: weatherData.tideStatus,
              tideHeight: weatherData.tideHeight,
            };
            await storage.logAlertTrigger(alert.id, triggerReason, snapshot).catch(err =>
              console.error(`⚠️ Failed to log trigger for alert ${alert.id}:`, err)
            );
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
