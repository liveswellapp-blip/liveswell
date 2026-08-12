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
import { resetDailyMetrics, getOpenWeatherRemainingCalls } from './monitoring';

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

  if (channels.includes('sms') && alert.phoneNumber && alert.phoneVerified) {
    console.log(`📱 Condition SMS → ${alert.phoneNumber} (${locationName}): ${triggerReason}`);
    promises.push(
      SMSService.sendConditionAlert(alert.phoneNumber, locationName, triggerReason, alert.locationId)
        .then(ok => { console.log(ok ? '✅ SMS sent' : '❌ SMS failed'); return ok; })
        .catch(() => false),
    );
  } else if (channels.includes('sms') && alert.phoneNumber && !alert.phoneVerified) {
    console.log(`⚠️  Skipping SMS for alert ${alert.id} — phone number not verified`);
  }

  if (channels.includes('email') && alert.userEmail) {
    console.log(`✉️  Condition email → ${alert.userEmail} (${locationName}): ${triggerReason}`);
    promises.push(
      EmailService.sendConditionAlert(alert.userEmail, locationName, triggerReason, alert.locationId, alert.id)
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

// ─── Timezone helpers for daily report scheduling ────────────────────────────

/** Returns the current wall-clock time as "HH:MM" in the given IANA timezone. */
function getCurrentTimeInTz(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()).replace(/^24/, '00');
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()).replace(/^24/, '00');
  }
}

/** Returns today's date as "YYYY-MM-DD" in the given IANA timezone. */
function getCurrentDateInTz(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
  }
}

/**
 * Returns true if a specific slot (HH:MM) already fired today in the given IANA timezone.
 * Uses the recorded lastFiredAt timestamp: if its date-in-tz is today AND its
 * time-in-tz matches the slotTime exactly, the slot is considered done.
 * This is order-agnostic — it doesn't matter which slot fired first.
 */
function slotFiredToday(lastFiredAt: Date, alertTz: string, slotTime: string, todayInTz: string): boolean {
  const lastFiredDateInTz = new Intl.DateTimeFormat('en-CA', { timeZone: alertTz }).format(lastFiredAt);
  if (lastFiredDateInTz !== todayInTz) return false;
  const lastFiredTimeInTz = new Intl.DateTimeFormat('en-US', {
    timeZone: alertTz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(lastFiredAt).replace(/^24/, '00');
  return lastFiredTimeInTz === slotTime;
}

// ─── Daily report dispatcher ─────────────────────────────────────────────────
/**
 * Dispatches a daily surf report across SMS and/or email channels.
 * Returns true if at least one channel delivered.
 */
async function dispatchDailyReport(alert: any): Promise<boolean> {
  const channels: string[] = alert.deliveryChannels ?? [];
  const promises: Promise<boolean>[] = [];

  if (channels.includes('sms') && alert.phoneNumber && alert.phoneVerified) {
    console.log(`📱 Daily report SMS → ${alert.phoneNumber} (${alert.locationName})`);
    promises.push(
      SMSService.sendDailyConditions(alert.userId, alert.phoneNumber, alert.locationId)
        .then(ok => { console.log(ok ? '✅ SMS sent' : '❌ SMS failed'); return ok; })
        .catch(() => false),
    );
  } else if (channels.includes('sms') && alert.phoneNumber && !alert.phoneVerified) {
    console.log(`⚠️  Skipping daily report SMS for alert ${alert.id} — phone number not verified`);
  }

  if (channels.includes('email') && alert.userEmail) {
    console.log(`✉️  Daily report email → ${alert.userEmail} (${alert.locationName})`);
    promises.push(
      EmailService.sendDailyConditions(alert.userEmail, alert.locationId, alert.id)
        .then(ok => { console.log(ok ? '✅ Email sent' : '❌ Email failed'); return ok; })
        .catch(() => false),
    );
  }

  if (channels.includes('push')) {
    console.log(`🔔 Daily report push → user ${alert.userId} (${alert.locationName})`);
    promises.push(
      (async () => {
        try {
          const conditions = await storage.getSurfConditions(alert.locationId);
          if (!conditions) { console.log('❌ Push failed (no conditions)'); return false; }
          const ok = await pushNotificationService.sendSurfConditionNotification(alert.userId, alert.locationName, {
            waveHeight: conditions.waveHeight || '0',
            wavePeriod: conditions.wavePeriod || 0,
            waveDirection: conditions.waveDirection || 'N/A',
            windSpeed: conditions.windSpeed || '0',
            windDirection: conditions.windDirection || 'N/A',
            waterTemp: conditions.waterTemp || 'N/A',
            tideHeight: conditions.tideHeight || '0',
            tideStatus: conditions.tideStatus || 'Unknown',
            uvIndex: conditions.uvIndex || 0,
            sunrise: conditions.sunrise || 'N/A',
            sunset: conditions.sunset || 'N/A',
          });
          console.log(ok ? '✅ Push sent' : '❌ Push failed');
          return ok;
        } catch { console.log('❌ Push failed (error)'); return false; }
      })(),
    );
  }

  if (promises.length === 0) {
    console.warn(`⚠️ Daily report alert ${alert.id} has no deliverable channels (no SMS number, email, or push subscribers)`);
    return false;
  }

  const results = await Promise.all(promises);
  return results.some(ok => ok);
}

// ─── ConditionMonitor ────────────────────────────────────────────────────────
export class ConditionMonitor {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Log monitored location count so operators can predict daily API usage.
    // Condition alerts run every 20 min → 72 checks/day per unique location.
    try {
      const [condAlerts, dailyAlerts] = await Promise.all([
        storage.getActiveConditionAlerts(),
        storage.getActiveDailyReportAlerts(),
      ]);
      const uniqueLocations = new Set([
        ...condAlerts.map((a: any) => a.locationId),
        ...dailyAlerts.map((a: any) => a.locationId),
      ]);
      // Each uncached location costs 3 OWM calls/cycle (weather + forecast + UV).
      // Cycle cadence: every 20 min → 72 cycles/day → 216 calls/location/day.
      const cyclesPerDay = Math.floor((24 * 60) / 20); // 72
      const owmCallsPerCycle = 3; // weather + forecast + UV index
      const callsPerLocationPerDay = cyclesPerDay * owmCallsPerCycle; // 216
      const estimatedCalls = uniqueLocations.size * callsPerLocationPerDay;
      const dailyLimit = 1000; // OpenWeather free-tier call cap
      const utilizationPct = dailyLimit > 0 ? Math.round((estimatedCalls / dailyLimit) * 100) : 0;
      console.log(
        `📍 Condition monitor: ${uniqueLocations.size} unique location(s) monitored` +
        ` → ~${estimatedCalls} OpenWeatherMap API calls/day (${utilizationPct}% of ${dailyLimit}/day free tier)` +
        ` (${owmCallsPerCycle} calls/cycle × ${cyclesPerDay} cycles × ${uniqueLocations.size} location(s)).` +
        ` Free tier limit: ${dailyLimit}/day (supports up to ${Math.floor(dailyLimit / callsPerLocationPerDay)} unique location(s)).`,
      );
      if (utilizationPct >= 80) {
        console.warn(
          `⚠️  OpenWeather daily quota WARNING: estimated usage is ${utilizationPct}% of the ${dailyLimit}/day free tier` +
          ` (${estimatedCalls} calls/day across ${uniqueLocations.size} unique location(s)).` +
          ` Upgrade your plan at https://openweathermap.org/api before adding more monitored locations` +
          ` to avoid data gaps. Free tier supports up to ${Math.floor(dailyLimit / callsPerLocationPerDay)} unique location(s).`
        );
      }
    } catch (err) {
      console.warn('⚠️ Could not compute monitored location count:', err);
    }

    // Condition alerts: run immediately on startup, then every 20 minutes
    await this.checkConditionAlerts();
    cron.schedule('*/20 * * * *', () => this.checkConditionAlerts());
    // Daily report scheduler: runs every minute, fires reports at user-configured times
    cron.schedule('* * * * *', () => this.checkDailyReportAlerts());
    // Reset daily API-call counters at midnight UTC
    cron.schedule('0 0 * * *', () => {
      resetDailyMetrics();
      console.log('🔄 Daily metrics reset at midnight UTC');
    }, { timezone: 'UTC' });
    this.initialized = true;
    console.log('🌊 Condition monitor initialized (condition alerts every 20 min, daily reports every 1 min, metrics reset at midnight UTC)');
  }

  static async checkDailyReportAlerts(): Promise<void> {
    try {
      const dailyAlerts = await storage.getActiveDailyReportAlerts();
      if (dailyAlerts.length === 0) return;

      for (const alert of dailyAlerts) {
        const tz = alert.timezone || 'America/New_York';
        const currentTime = getCurrentTimeInTz(tz);
        const todayInTz = getCurrentDateInTz(tz);

        // Build the list of slots that match this exact minute.
        // Both notificationTime and notificationTimeTwo are peer slots —
        // neither is "primary"; the check is fully order-agnostic.
        const matchingSlots: string[] = [];
        if (alert.notificationTime === currentTime) {
          matchingSlots.push(alert.notificationTime);
        }
        if (
          alert.frequency === 'twice_daily' &&
          alert.notificationTimeTwo &&
          alert.notificationTimeTwo === currentTime &&
          !matchingSlots.includes(alert.notificationTimeTwo)
        ) {
          matchingSlots.push(alert.notificationTimeTwo);
        }

        if (matchingSlots.length === 0) continue;

        for (const slot of matchingSlots) {
          // Slot-based idempotency: skip if this exact slot already fired today.
          // For once_daily we use a simple date-only guard (any fire today = done).
          // For twice_daily we check whether lastFiredAt maps to THIS slot's time,
          // so both slots can fire independently regardless of ordering.
          if (alert.lastFiredAt) {
            if (alert.frequency === 'once_daily') {
              const lastFiredDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz })
                .format(new Date(alert.lastFiredAt));
              if (lastFiredDate === todayInTz) {
                console.log(`⏭️ Alert ${alert.id} (once_daily) already fired today — skipping`);
                continue;
              }
            } else if (slotFiredToday(new Date(alert.lastFiredAt), tz, slot, todayInTz)) {
              console.log(`⏭️ Alert ${alert.id} slot ${slot} already fired today — skipping`);
              continue;
            }
          }

          console.log(`📅 Daily report due: alert ${alert.id} for ${alert.locationName} at ${slot} ${tz}`);
          const delivered = await dispatchDailyReport(alert);

          if (delivered) {
            await storage.updateAlertLastFiredAt(alert.id, new Date());
            await storage.logAlertTrigger(alert.id, `Daily report sent at ${slot} ${tz}`).catch(() => {});
          } else {
            console.warn(`⚠️ Daily report alert ${alert.id} slot ${slot} — all channels failed`);
          }
        }
      }
    } catch (error) {
      console.error('Error in daily report scheduler:', error);
    }
  }

  static async checkConditionAlerts(): Promise<void> {
    try {
      const conditionAlerts = await storage.getActiveConditionAlerts();
      if (conditionAlerts.length === 0) return;

      // ── Quota guard ─────────────────────────────────────────────────────────
      // Warn when remaining tracked API calls drop below the warning threshold so
      // operators know to upgrade the OpenWeather plan before real data stops.
      // Threshold is configurable via OPENWEATHER_QUOTA_WARN_THRESHOLD (default 100).
      const quotaWarnThreshold = parseInt(
        process.env.OPENWEATHER_QUOTA_WARN_THRESHOLD ?? '100',
        10
      );
      const remainingCalls = getOpenWeatherRemainingCalls();
      if (remainingCalls <= quotaWarnThreshold) {
        console.warn(
          `⚠️  OpenWeather quota low: ${remainingCalls} call(s) remaining today` +
          ` (warn threshold: ${quotaWarnThreshold}).` +
          ` Upgrade the plan at https://openweathermap.org/api to avoid data gaps.`
        );
      }
      // ────────────────────────────────────────────────────────────────────────

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
