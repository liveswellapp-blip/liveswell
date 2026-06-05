import * as cron from 'node-cron';
import { storage } from './storage';
import { SMSService } from './sms-service';
import { EmailService } from './email-service';
import { pushNotificationService } from './push-service';
import { ConditionMonitor } from './condition-monitor';
import { db } from './db';
import { userAlerts, notificationSettings } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Returns the current HH:MM in a given IANA timezone.
 * Falls back to server local time if the timezone is invalid.
 */
function currentTimeInTz(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find(p => p.type === 'hour')?.value ?? '00';
    const m = parts.find(p => p.type === 'minute')?.value ?? '00';
    // Intl can return '24' for midnight — normalise to '00'
    const hh = h === '24' ? '00' : h.padStart(2, '0');
    return `${hh}:${m.padStart(2, '0')}`;
  } catch {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}

export class NotificationScheduler {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔔 Initializing notification scheduler...');

    const smsConfigured = await SMSService.testSMSConfiguration();
    if (smsConfigured) {
      console.log('✅ SMS service configured and ready');
    } else {
      console.warn('⚠️ SMS service not properly configured');
    }

    // Initialize condition-based alert monitor (runs every 20 min)
    await ConditionMonitor.initialize();

    // One-time backfill: migrate existing notification_settings rows into user_alerts
    await this.backfillLegacySettings();

    // Every minute: check all active user_alerts, respecting per-alert timezones
    cron.schedule('* * * * *', async () => {
      await this.checkUserAlerts();
    });

    this.initialized = true;
    console.log('🔔 Notification scheduler initialized');
  }

  /**
   * Migrate legacy notification_settings rows (smsEnabled or pushEnabled) that
   * don't yet have a corresponding user_alerts entry. Runs once at startup.
   */
  private static async backfillLegacySettings(): Promise<void> {
    try {
      const legacy = await db.select().from(notificationSettings);
      let migrated = 0;

      for (const row of legacy) {
        if (!row.locationId) continue;
        if (!row.smsEnabled && !row.pushEnabled) continue;

        // Check if this user already has any user_alerts rows
        const existing = await db
          .select({ id: userAlerts.id })
          .from(userAlerts)
          .where(eq(userAlerts.userId, row.userId))
          .limit(1);

        if (existing.length > 0) continue; // already migrated

        const channels: string[] = [];
        if (row.smsEnabled) channels.push('sms');
        if (row.pushEnabled) channels.push('push');

        await db.insert(userAlerts).values({
          userId: row.userId,
          locationId: row.locationId,
          label: 'Daily surf report',
          alertType: 'daily_report',
          deliveryChannels: channels,
          frequency: 'once_daily',
          notificationTime: row.notificationTime ?? '08:00',
          notificationTimeTwo: null,
          timezone: row.timezone ?? 'America/New_York',
          phoneNumber: row.phoneNumber ?? null,
          active: true,
          updatedAt: new Date(),
        });

        migrated++;
        console.log(`🔄 Migrated legacy alert for user ${row.userId}`);
      }

      if (migrated > 0) {
        console.log(`✅ Backfilled ${migrated} legacy notification setting(s) into user_alerts`);
      }
    } catch (error) {
      console.error('Error during legacy settings backfill:', error);
    }
  }

  /**
   * Called every minute. For each active alert, compute the current time in
   * that alert's stored timezone and compare against notificationTime /
   * notificationTimeTwo. Dispatches channels only when the times match.
   */
  private static async checkUserAlerts(): Promise<void> {
    try {
      // Fetch all active alerts with location name + user email
      const allActive = await storage.getAllActiveUserAlerts();
      if (allActive.length === 0) return;

      // Group by timezone so we call currentTimeInTz once per unique tz
      const tzCache = new Map<string, string>();
      const getTime = (tz: string) => {
        if (!tzCache.has(tz)) tzCache.set(tz, currentTimeInTz(tz));
        return tzCache.get(tz)!;
      };

      const due = allActive.filter(alert => {
        // Condition alerts (swell/wind/tide) are handled by ConditionMonitor
        if (alert.alertType !== 'daily_report') return false;
        const localTime = getTime(alert.timezone);
        return (
          alert.notificationTime === localTime ||
          (alert.frequency === 'twice_daily' && alert.notificationTimeTwo === localTime)
        );
      });

      if (due.length === 0) return;

      console.log(`🔔 Processing ${due.length} alert(s)`);

      for (const alert of due) {
        const channels = alert.deliveryChannels ?? [];
        const promises: Promise<boolean>[] = [];

        if (channels.includes('sms') && alert.phoneNumber) {
          console.log(`📱 SMS → ${alert.phoneNumber} (${alert.locationName})`);
          promises.push(
            SMSService.sendDailyConditions(alert.userId, alert.phoneNumber, alert.locationId)
              .then(ok => { console.log(ok ? '✅ SMS sent' : '❌ SMS failed'); return ok; })
          );
        }

        if (channels.includes('email') && alert.userEmail) {
          console.log(`✉️  Email → ${alert.userEmail} (${alert.locationName})`);
          promises.push(
            EmailService.sendDailyConditions(alert.userEmail, alert.locationId)
              .then(ok => { console.log(ok ? '✅ Email sent' : '❌ Email failed'); return ok; })
          );
        }

        if (channels.includes('push')) {
          console.log(`🔔 Push → user ${alert.userId} (${alert.locationName})`);
          promises.push(
            this.sendPushConditions(alert.userId, alert.locationId, alert.locationName)
              .then(ok => { console.log(ok ? '✅ Push sent' : '❌ Push failed'); return ok; })
          );
        }

        if (promises.length > 0) await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  }

  private static async sendPushConditions(userId: string, locationId: number, locationName: string): Promise<boolean> {
    try {
      const conditions = await storage.getSurfConditions(locationId);
      if (!conditions) return false;

      return await pushNotificationService.sendSurfConditionNotification(userId, locationName, {
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
    } catch (error) {
      console.error('Error sending push conditions:', error);
      return false;
    }
  }

  static async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const alerts = await storage.getUserAlerts(userId);
      const firstActive = alerts.find(a => a.active);

      if (!firstActive) {
        // Fall back to old notification_settings
        const settings = await storage.getNotificationSettings(userId);
        if (!settings?.locationId) return false;

        const promises: Promise<boolean>[] = [];
        if (settings.smsEnabled && settings.phoneNumber) {
          promises.push(SMSService.sendDailyConditions(userId, settings.phoneNumber, settings.locationId));
        }
        if (settings.pushEnabled) {
          promises.push(pushNotificationService.sendTestNotificationToUser(userId));
        }
        if (promises.length === 0) return false;
        const results = await Promise.all(promises);
        return results.some(Boolean);
      }

      const channels = firstActive.deliveryChannels ?? [];
      const promises: Promise<boolean>[] = [];

      if (channels.includes('sms') && firstActive.phoneNumber) {
        promises.push(SMSService.sendDailyConditions(userId, firstActive.phoneNumber, firstActive.locationId));
      }
      if (channels.includes('push')) {
        promises.push(pushNotificationService.sendTestNotificationToUser(userId));
      }
      if (channels.includes('email')) {
        const allActive = await storage.getAllActiveUserAlerts();
        const withEmail = allActive.find(a => a.id === firstActive.id);
        if (withEmail?.userEmail) {
          promises.push(EmailService.sendDailyConditions(withEmail.userEmail, firstActive.locationId));
        }
      }
      if (promises.length === 0) return false;

      const results = await Promise.all(promises);
      return results.some(Boolean);
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}
