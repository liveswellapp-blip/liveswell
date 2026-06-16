import { storage } from './storage';
import { SMSService } from './sms-service';
import { EmailService } from './email-service';
import { pushNotificationService } from './push-service';
import { ConditionMonitor } from './condition-monitor';
import { db } from './db';
import { userAlerts, notificationSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

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

    // Initialize condition-based alert monitor (runs every 20 min for condition alerts,
    // every 1 min for daily reports — this is the single owner of daily report dispatch)
    await ConditionMonitor.initialize();

    // One-time backfill: migrate existing notification_settings rows into user_alerts
    await this.backfillLegacySettings();

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
