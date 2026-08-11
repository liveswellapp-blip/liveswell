import twilio from 'twilio';
import { storage } from './storage';
import type { Location } from '@shared/schema';
import { fetchWeatherData } from './weather-service';
import { generateNotificationSummary } from './ai-service';
import { db } from './db';
import { phoneVerificationTokens, verifiedPhones as verifiedPhonesTable, smsRateLimits } from '@shared/schema';
import { and, eq, gt, gte, lt, asc } from 'drizzle-orm';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('Twilio credentials not configured - SMS notifications will be disabled');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Normalise a phone number to E.164 format.
 * All non-digit characters (spaces, dashes, parentheses, etc.) are stripped
 * before the country-code logic runs, so formatted strings like
 * "+1 (555) 123-4567" produce the same canonical value as "+15551234567".
 *
 * - Numbers that begin with "+" after trimming have their country code
 *   preserved; only punctuation is removed.
 * - 10-digit US numbers get "+1" prepended.
 * - 11-digit numbers starting with "1" get "+" prepended.
 * - Everything else is returned digits-only so Twilio can surface a
 *   meaningful error rather than a mangled destination.
 */
export function normalizePhone(phone: string): string {
  const stripped = phone.trim();
  const hasPlus = stripped.startsWith('+');
  // Strip all non-digit characters so formatted inputs are canonicalised
  const digits = stripped.replace(/\D/g, '');
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Unknown format — return digits-only so Twilio can reject it clearly.
  return digits;
}

/**
 * Thrown by SMSService.verifyCode() when the submitted phone number is
 * already verified under a *different* user account.  The route layer
 * converts this to a 409 response.  Throwing only after the code has been
 * validated means callers cannot use the error to enumerate ownership of
 * arbitrary phone numbers.
 */
export class PhoneConflictError extends Error {
  constructor() {
    super('Phone number is already verified under a different account');
    this.name = 'PhoneConflictError';
  }
}

interface BuoySummary {
  stationId: string;
  stationName?: string;
  waveHeight: number | string;
  wavePeriod: number;
  waveDirection: string;
}

interface SurfConditionsData {
  waveHeight: string;
  wavePeriod: number;
  waveDirection: string;
  windSpeed: string;
  windDirection: string;
  windGusts?: string | null;
  waterTemp: string;
  tideHigh: Array<{ time: string; height: string }>;
  tideLow: Array<{ time: string; height: string }>;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  dataTimestamp: string;
  primaryBuoy?: BuoySummary | null;
  backupBuoy?: BuoySummary | null;
}

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export class SMSService {
  // ─── Rate Limiting ───────────────────────────────────────────────────────────

  static async getRateLimitInfo(userId: string, phoneNumber: string): Promise<{ allowed: boolean; waitSeconds: number }> {
    const phone = normalizePhone(phoneNumber);
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

    const rows = await db
      .select({ sentAt: smsRateLimits.sentAt })
      .from(smsRateLimits)
      .where(
        and(
          eq(smsRateLimits.userId, userId),
          eq(smsRateLimits.phone, phone),
          eq(smsRateLimits.limitType, 'outbound'),
          gte(smsRateLimits.sentAt, windowStart),
        ),
      )
      .orderBy(asc(smsRateLimits.sentAt));

    if (rows.length >= RATE_LIMIT_MAX) {
      const oldestInWindow = rows[0].sentAt.getTime();
      const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - oldestInWindow)) / 1000);
      return { allowed: false, waitSeconds };
    }
    return { allowed: true, waitSeconds: 0 };
  }

  private static async recordSendAttempt(userId: string, phoneNumber: string): Promise<void> {
    const phone = normalizePhone(phoneNumber);
    await db.insert(smsRateLimits).values({ userId, phone, limitType: 'outbound', sentAt: new Date() });

    // Prune outbound rows older than the window to keep the table tidy
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    await db.delete(smsRateLimits).where(
      and(
        eq(smsRateLimits.userId, userId),
        eq(smsRateLimits.phone, phone),
        eq(smsRateLimits.limitType, 'outbound'),
        lt(smsRateLimits.sentAt, windowStart),
      ),
    );
  }

  // ─── Phone Verification ─────────────────────────────────────────────────────

  static async sendVerificationCode(userId: string, phoneNumber: string): Promise<boolean> {
    if (!client || !twilioPhoneNumber) {
      console.error('Twilio not configured — cannot send verification SMS');
      return false;
    }
    const phone = normalizePhone(phoneNumber);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL

    // Record this attempt for rate limiting (before sending so partial failures still count)
    await SMSService.recordSendAttempt(userId, phoneNumber);

    // Delete any existing pending token for this user+phone, then insert fresh one
    await db.delete(phoneVerificationTokens).where(
      and(eq(phoneVerificationTokens.userId, userId), eq(phoneVerificationTokens.phone, phone))
    );
    await db.insert(phoneVerificationTokens).values({ userId, phone, code, expiresAt });

    try {
      await client.messages.create({
        body: `Your LiveSwell verification code is: ${code}\n\nIt expires in 10 minutes.`,
        from: twilioPhoneNumber,
        to: phone,
      });
      console.log(`📱 Verification code sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('Error sending verification SMS:', error);
      // Clean up the token if SMS failed to send
      await db.delete(phoneVerificationTokens).where(
        and(eq(phoneVerificationTokens.userId, userId), eq(phoneVerificationTokens.phone, phone))
      );
      return false;
    }
  }

  static async verifyCode(userId: string, phoneNumber: string, code: string): Promise<boolean> {
    const phone = normalizePhone(phoneNumber);
    const now = new Date();

    const [entry] = await db.select()
      .from(phoneVerificationTokens)
      .where(and(
        eq(phoneVerificationTokens.userId, userId),
        eq(phoneVerificationTokens.phone, phone),
        gt(phoneVerificationTokens.expiresAt, now),
      ))
      .limit(1);

    if (!entry) return false;
    if (entry.code !== code.trim()) return false;

    // Code is valid — consume the token before writing verified state so
    // a replay cannot piggyback on a still-present token.
    await db.delete(phoneVerificationTokens).where(eq(phoneVerificationTokens.id, entry.id));

    // Remove any existing verified-phone row for THIS user+phone, then
    // insert a fresh one.  The unique index on verified_phones.phone means
    // that if a *different* user already owns this number the insert will
    // throw a uniqueness violation (PG error code 23505), which we surface
    // as PhoneConflictError.  The check happens after code validation so
    // callers cannot enumerate ownership of arbitrary phone numbers.
    await db.delete(verifiedPhonesTable).where(
      and(eq(verifiedPhonesTable.userId, userId), eq(verifiedPhonesTable.phone, phone))
    );
    try {
      await db.insert(verifiedPhonesTable).values({ userId, phone, verifiedAt: now });
    } catch (err: any) {
      // PostgreSQL unique_violation = SQLSTATE 23505
      if (err?.code === '23505' || err?.message?.includes('unique')) {
        throw new PhoneConflictError();
      }
      throw err;
    }

    return true;
  }

  static async isPhoneVerified(userId: string, phoneNumber: string): Promise<boolean> {
    const phone = normalizePhone(phoneNumber);
    const [row] = await db.select()
      .from(verifiedPhonesTable)
      .where(and(eq(verifiedPhonesTable.userId, userId), eq(verifiedPhonesTable.phone, phone)))
      .limit(1);
    return !!row;
  }

  static async clearVerifiedPhone(userId: string, phoneNumber: string): Promise<void> {
    const phone = normalizePhone(phoneNumber);
    await db.delete(verifiedPhonesTable).where(
      and(eq(verifiedPhonesTable.userId, userId), eq(verifiedPhonesTable.phone, phone))
    );
    await db.delete(phoneVerificationTokens).where(
      and(eq(phoneVerificationTokens.userId, userId), eq(phoneVerificationTokens.phone, phone))
    );
  }

  // ─── SMS Delivery ───────────────────────────────────────────────────────────

  static async sendDailyConditions(userId: string, phoneNumber: string, locationId: number): Promise<boolean> {
    if (!client || !twilioPhoneNumber) {
      console.error('Twilio not configured - cannot send SMS');
      return false;
    }

    try {
      // Fetch location details
      const location = await storage.getLocation(locationId);
      if (!location) {
        console.error(`Location ${locationId} not found`);
        return false;
      }

      // Fetch current conditions - use the weather service to get real-time data
      const weatherData = await fetchWeatherData(parseFloat(location.latitude), parseFloat(location.longitude));
      if (!weatherData) {
        console.error(`No conditions found for location ${locationId}`);
        return false;
      }

      // Format conditions for SMS — include date and timezone abbreviation
      const now = new Date();
      const tz = (location as any).timezone || 'America/New_York';
      const datePart = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', timeZone: tz });
      const timePart = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
      const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? tz;
      const timestamp = `${datePart} | ${timePart} ${tzAbbr}`;
      
      const makeBuoySummary = (b: any): BuoySummary | null => {
        if (!b || !b.stationId) return null;
        return {
          stationId: b.stationId,
          stationName: b.stationName,
          waveHeight: b.waveHeight,
          wavePeriod: b.wavePeriod || 0,
          waveDirection: b.waveDirection || '',
        };
      };

      const conditions = {
        waveHeight: `${weatherData.waveHeight}`,
        wavePeriod: weatherData.wavePeriod || 8,
        waveDirection: weatherData.waveDirection || 'W',
        windSpeed: `${weatherData.windSpeed}`,
        windDirection: weatherData.windDirection || 'W',
        windGusts: weatherData.windGusts ? `${weatherData.windGusts}` : null,
        waterTemp: `${Math.round(weatherData.waterTemp)}`,
        tideHigh: weatherData.tideHigh || [
          { time: '5:30 AM', height: '5.4' },
          { time: '6:15 PM', height: '4.8' }
        ],
        tideLow: weatherData.tideLow || [
          { time: '11:45 AM', height: '0.8' },
          { time: '11:30 PM', height: '1.2' }
        ],
        uvIndex: weatherData.uvIndex || 5,
        sunrise: weatherData.sunrise || '6:30 AM',
        sunset: weatherData.sunset || '6:30 PM',
        dataTimestamp: timestamp,
        primaryBuoy: makeBuoySummary((weatherData as any).primaryBuoy),
        backupBuoy: makeBuoySummary((weatherData as any).backupBuoy),
      };

      // Try AI summary (non-blocking — falls back gracefully)
      let aiSentence: string | null = null;
      try {
        aiSentence = await Promise.race([
          generateNotificationSummary(locationId, 'daily'),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch { /* fall through */ }

      // Format the SMS message
      const message = SMSService.formatConditionsMessage(location, conditions, aiSentence);

      // Send SMS via Twilio
      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`SMS sent successfully: ${result.sid} to ${phoneNumber}`);
      console.log(`Message status: ${result.status}`);
      console.log(`Message direction: ${result.direction}`);
      console.log(`From: ${result.from}, To: ${result.to}`);
      console.log(`Error code: ${result.errorCode || 'none'}`);
      console.log(`Error message: ${result.errorMessage || 'none'}`);
      
      // Check delivery status after a few seconds
      setTimeout(async () => {
        try {
          const message = await client.messages(result.sid).fetch();
          console.log(`📱 Delivery status update for ${result.sid}:`);
          console.log(`Final status: ${message.status}`);
          console.log(`Price: ${message.price} ${message.priceUnit}`);
          if (message.errorCode) {
            console.log(`Delivery error: ${message.errorCode} - ${message.errorMessage}`);
          }
        } catch (error) {
          console.log(`Could not fetch delivery status: ${error}`);
        }
      }, 10000); // Check after 10 seconds
      
      return true;

    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  static formatConditionsMessage(location: Location, conditions: SurfConditionsData, aiSentence?: string | null): string {
    // Convert UV index to description
    const getUVDescription = (uvIndex: number): string => {
      if (uvIndex <= 2) return 'Low';
      if (uvIndex <= 5) return 'Med';
      if (uvIndex <= 7) return 'High';
      return 'Very High';
    };

    // Tides — pipe-separated per type
    const highTides = conditions.tideHigh.map(t => `${t.time} (${t.height}ft)`).join(' | ');
    const lowTides  = conditions.tideLow.map(t  => `${t.time} (${t.height}ft)`).join(' | ');

    const aiLine = aiSentence ? `\n${aiSentence}\n` : '';

    const formatBuoyData = (buoy: BuoySummary): string => {
      const wh = buoy.waveHeight != null ? `${parseFloat(buoy.waveHeight.toFixed(1))}ft` : '—';
      const wp = buoy.wavePeriod ? `${Math.round(buoy.wavePeriod)}s` : '';
      const wd = buoy.waveDirection || '';
      return [wh, wp, wd].filter(Boolean).join(' @ ');
    };

    // Swell section — primary always shown; secondary only when available
    const primaryBuoyName = conditions.primaryBuoy
      ? `${conditions.primaryBuoy.stationId} ${conditions.primaryBuoy.stationName || ''}`.trim()
      : null;
    const primarySwellLine = primaryBuoyName
      ? `Primary Buoy - ${primaryBuoyName}\n${formatBuoyData(conditions.primaryBuoy!)}`
      : `${conditions.waveHeight}ft @ ${conditions.wavePeriod}s ${conditions.waveDirection}`;

    const secondaryBuoyName = conditions.backupBuoy
      ? `${conditions.backupBuoy.stationId} ${conditions.backupBuoy.stationName || ''}`.trim()
      : null;
    const secondarySwellLine = secondaryBuoyName
      ? `\n\nSecondary Buoy - ${secondaryBuoyName}\n${formatBuoyData(conditions.backupBuoy!)}`
      : '';

    // Wind — append gusts when available
    const windLine = conditions.windGusts
      ? `${conditions.windSpeed}mph ${conditions.windDirection} | Gusts ${conditions.windGusts}mph ${conditions.windDirection}`
      : `${conditions.windSpeed}mph ${conditions.windDirection}`;

    return `${location.name} Surf Report${aiLine}

Live Conditions (${conditions.dataTimestamp})

Swell
${primarySwellLine}${secondarySwellLine}

Wind
${windLine}

Water
${conditions.waterTemp}°F

Tides & Sun
High - ${highTides}
Low - ${lowTides}
Sunrise - ${conditions.sunrise}
Sunset - ${conditions.sunset}
UV - ${conditions.uvIndex} (${getUVDescription(conditions.uvIndex)})

Reply STOP to opt out.`;
  }

  static async sendConditionAlert(
    phoneNumber: string,
    locationName: string,
    triggerReason: string,
    locationId: number,
  ): Promise<boolean> {
    if (!client || !twilioPhoneNumber) {
      console.error('Twilio not configured — cannot send condition alert SMS');
      return false;
    }

    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      // Attempt to include a compact conditions snapshot + session rating
      let conditionsLine = '';
      try {
        const { storage } = await import('./storage');
        const { fetchWeatherData } = await import('./weather-service');
        const location = await storage.getLocation(locationId);
        if (location) {
          const wd = await fetchWeatherData(parseFloat(location.latitude), parseFloat(location.longitude));
          if (wd) {
            const wh = parseFloat(String(wd.waveHeight ?? 0));
            const wp = Number(wd.wavePeriod ?? 0);
            const ws = parseFloat(String(wd.windSpeed ?? 0));
            let rating = 'Poor';
            if (wh >= 3 && wp >= 10 && ws < 15) rating = 'Good ✅';
            else if (wh >= 2 && ws < 25) rating = 'Fair 〜';
            conditionsLine = `\nWaves: ${wd.waveHeight}ft · ${wd.wavePeriod}s · Wind: ${wd.windSpeed}mph\nSession: ${rating}`;
          }
        }
      } catch { /* non-blocking fallback */ }

      const message = `🚨 LiveSwell Alert

${triggerReason} at ${locationName}
Triggered: ${timestamp}${conditionsLine}

Open the app for full forecast.
Reply STOP to opt out. liveswell.io`;

      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`📱 Condition alert SMS sent: ${result.sid} to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('Error sending condition alert SMS:', error);
      return false;
    }
  }

  static async testSMSConfiguration(): Promise<boolean> {
    if (!client) {
      console.log('Twilio not configured');
      return false;
    }

    try {
      // Test by fetching account info
      const account = await client.api.accounts(accountSid!).fetch();
      console.log(`Twilio account verified: ${account.friendlyName}`);
      return true;
    } catch (error) {
      console.error('Twilio configuration test failed:', error);
      return false;
    }
  }
}
