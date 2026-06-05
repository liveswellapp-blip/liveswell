import * as cron from 'node-cron';
import { storage } from './storage';
import { SMSService } from './sms-service';
import { EmailService } from './email-service';
import { pushNotificationService } from './push-service';

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

    // Every minute: check user_alerts for both primary and secondary times
    cron.schedule('* * * * *', async () => {
      await this.checkUserAlerts();
    });

    this.initialized = true;
    console.log('🔔 Notification scheduler initialized');
  }

  private static async checkUserAlerts(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const alerts = await storage.getActiveUserAlertsForTime(currentTime);
      if (alerts.length === 0) return;

      console.log(`🔔 Processing ${alerts.length} alert(s) for time ${currentTime}`);

      for (const alert of alerts) {
        const channels = alert.deliveryChannels ?? [];
        const promises: Promise<boolean>[] = [];

        if (channels.includes('sms') && alert.phoneNumber) {
          console.log(`📱 SMS alert → ${alert.phoneNumber} (${alert.locationName})`);
          promises.push(
            SMSService.sendDailyConditions(alert.userId, alert.phoneNumber, alert.locationId)
              .then(ok => { console.log(ok ? `✅ SMS sent` : `❌ SMS failed`); return ok; })
          );
        }

        if (channels.includes('email') && alert.userEmail) {
          console.log(`✉️  Email alert → ${alert.userEmail} (${alert.locationName})`);
          promises.push(
            EmailService.sendDailyConditions(alert.userEmail, alert.locationId)
              .then(ok => { console.log(ok ? `✅ Email sent` : `❌ Email failed`); return ok; })
          );
        }

        if (channels.includes('push')) {
          console.log(`🔔 Push alert → user ${alert.userId} (${alert.locationName})`);
          promises.push(
            this.sendPushConditions(alert.userId, alert.locationId, alert.locationName)
              .then(ok => { console.log(ok ? `✅ Push sent` : `❌ Push failed`); return ok; })
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
      if (promises.length === 0) return false;

      const results = await Promise.all(promises);
      return results.some(Boolean);
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}
