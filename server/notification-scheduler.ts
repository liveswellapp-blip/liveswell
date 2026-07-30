import { storage } from './storage';
import { SMSService } from './sms-service';
import { EmailService } from './email-service';
import { pushNotificationService } from './push-service';
import { ConditionMonitor } from './condition-monitor';
import { purgeStaleWeatherCache } from './weather-service';
import { runPushHealthCheck } from './push-health-monitor';
import { db } from './db';
import { userAlerts, notificationSettings, users, locations } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import * as cron from 'node-cron';

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

    const emailHealthy = await EmailService.checkHealth();
    if (!emailHealthy) {
      console.warn('⚠️ Email service health-check failed — emails may not be delivered until the connector is restored');
    }

    // Initialize condition-based alert monitor (runs every 20 min for condition alerts,
    // every 1 min for daily reports — this is the single owner of daily report dispatch)
    await ConditionMonitor.initialize();

    // One-time backfill: migrate existing notification_settings rows into user_alerts
    await this.backfillLegacySettings();

    // Run immediately on startup to catch anything overdue, then daily at 02:00 UTC
    await this.disableUnverifiedSmsChannels();
    cron.schedule('0 2 * * *', () => {
      this.disableUnverifiedSmsChannels().catch(err =>
        console.error('Error in disableUnverifiedSmsChannels job:', err)
      );
    });

    // Periodically purge stale weather-cache rows so the DB table stays lean
    // even when the server runs for a long time without restarting.
    // Runs every 20 minutes (aligned with the condition-alert check cadence).
    cron.schedule('*/20 * * * *', () => {
      purgeStaleWeatherCache().catch(err =>
        console.error('Error in purgeStaleWeatherCache job:', err)
      );
    });

    // ── Push notification health monitoring ──────────────────────────────────
    // Run once on startup (after a 5-second delay to allow VAPID setup to
    // complete) so any post-deploy misconfiguration triggers an immediate alert.
    setTimeout(() => {
      runPushHealthCheck('startup').catch(err =>
        console.error('Error in startup push health check:', err)
      );
    }, 5000);

    // Also check every 6 hours to catch runtime degradation (e.g. env var
    // accidentally cleared, service restart with missing secrets).
    cron.schedule('0 */6 * * *', () => {
      runPushHealthCheck('scheduled').catch(err =>
        console.error('Error in scheduled push health check:', err)
      );
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
   * Finds alerts where SMS is a delivery channel but the phone has not been verified
   * within 24 hours of the alert being created. Removes 'sms' from deliveryChannels
   * and sends the user an email explaining why.
   */
  static async disableUnverifiedSmsChannels(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const stale = await db
        .select({
          id: userAlerts.id,
          userId: userAlerts.userId,
          label: userAlerts.label,
          deliveryChannels: userAlerts.deliveryChannels,
          phoneNumber: userAlerts.phoneNumber,
          createdAt: userAlerts.createdAt,
          locationName: locations.name,
          userEmail: users.email,
        })
        .from(userAlerts)
        .innerJoin(locations, eq(locations.id, userAlerts.locationId))
        .innerJoin(users, eq(users.id, userAlerts.userId))
        .where(
          and(
            eq(userAlerts.phoneVerified, false),
            lt(userAlerts.createdAt, cutoff),
            sql`'sms' = ANY(${userAlerts.deliveryChannels})`
          )
        );

      if (stale.length === 0) return;

      console.log(`📵 Disabling SMS channel on ${stale.length} unverified alert(s)...`);

      for (const alert of stale) {
        const updatedChannels = (alert.deliveryChannels ?? []).filter(c => c !== 'sms');

        await db
          .update(userAlerts)
          .set({ deliveryChannels: updatedChannels, updatedAt: new Date() })
          .where(eq(userAlerts.id, alert.id));

        console.log(`📵 Removed SMS channel from alert ${alert.id} (user ${alert.userId})`);

        if (alert.userEmail && alert.phoneNumber) {
          const label = alert.label || alert.locationName;
          await EmailService.sendSmsDisabledNotification(
            alert.userEmail,
            label,
            alert.locationName,
            alert.phoneNumber,
          ).catch(err => console.error(`Failed to send SMS-disabled email for alert ${alert.id}:`, err));
        }
      }

      console.log(`✅ SMS channel cleanup complete (${stale.length} alert(s) updated)`);
    } catch (error) {
      console.error('Error in disableUnverifiedSmsChannels:', error);
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

      if (channels.includes('sms') && firstActive.phoneNumber && firstActive.phoneVerified) {
        promises.push(SMSService.sendDailyConditions(userId, firstActive.phoneNumber, firstActive.locationId));
      }
      if (channels.includes('push')) {
        promises.push(pushNotificationService.sendTestNotificationToUser(userId));
      }
      if (channels.includes('email')) {
        const allActive = await storage.getAllActiveUserAlerts();
        const withEmail = allActive.find(a => a.id === firstActive.id);
        if (withEmail?.userEmail) {
          promises.push(EmailService.sendDailyConditions(withEmail.userEmail, firstActive.locationId, firstActive.id));
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
