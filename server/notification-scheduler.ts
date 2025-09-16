import * as cron from 'node-cron';
import { storage } from './storage';
import { SMSService } from './sms-service';
import { pushNotificationService } from './push-service';
import { eq, and, ne, or } from 'drizzle-orm';
import { notificationSettings, locations } from '@shared/schema';

export class NotificationScheduler {
  private static cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔔 Initializing notification scheduler...');

    // Test SMS configuration
    const smsConfigured = await SMSService.testSMSConfiguration();
    if (smsConfigured) {
      console.log('✅ SMS service configured and ready');
    } else {
      console.warn('⚠️ SMS service not properly configured');
    }

    // Schedule a job that runs every minute to check for notifications to send
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendNotifications();
    });

    this.initialized = true;
    console.log('🔔 Notification scheduler initialized');
  }

  private static async checkAndSendNotifications(): Promise<void> {
    try {
      // Get current time in HH:MM format
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Get all users with notifications (SMS or push) enabled for this time
      const usersToNotify = await this.getUsersForNotification(currentTime);

      for (const user of usersToNotify) {
        const promises: Promise<boolean>[] = [];
        
        // Send SMS notification if enabled and configured
        if (user.smsEnabled && user.phoneNumber) {
          console.log(`📱 Sending SMS notification to ${user.phoneNumber} for ${user.locationName}`);
          promises.push(
            SMSService.sendDailyConditions(user.userId, user.phoneNumber, user.locationId)
              .then(success => {
                if (success) {
                  console.log(`✅ SMS sent to ${user.phoneNumber}`);
                } else {
                  console.error(`❌ Failed to send SMS to ${user.phoneNumber}`);
                }
                return success;
              })
          );
        }

        // Send push notification if enabled
        if (user.pushEnabled) {
          console.log(`🔔 Sending push notification to user ${user.userId} for ${user.locationName}`);
          promises.push(
            this.sendPushConditions(user.userId, user.locationId, user.locationName)
              .then(success => {
                if (success) {
                  console.log(`✅ Push notification sent to user ${user.userId}`);
                } else {
                  console.error(`❌ Failed to send push notification to user ${user.userId}`);
                }
                return success;
              })
          );
        }

        // Wait for all notifications to complete
        if (promises.length > 0) {
          await Promise.all(promises);
        }
      }

    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  }

  private static async getUsersForNotification(currentTime: string): Promise<Array<{
    userId: string;
    smsEnabled: boolean;
    pushEnabled: boolean;
    phoneNumber: string | null;
    locationId: number;
    locationName: string;
  }>> {
    try {
      // Query users with notifications enabled for current time
      // This is a simplified approach - in production you might want to consider timezones
      const { db } = await import('./db');
      const result = await db
        .select({
          userId: notificationSettings.userId,
          smsEnabled: notificationSettings.smsEnabled,
          pushEnabled: notificationSettings.pushEnabled,
          phoneNumber: notificationSettings.phoneNumber,
          locationId: notificationSettings.locationId,
          locationName: locations.name,
        })
        .from(notificationSettings)
        .innerJoin(locations, eq(locations.id, notificationSettings.locationId))
        .where(
          and(
            or(
              eq(notificationSettings.smsEnabled, true),
              eq(notificationSettings.pushEnabled, true)
            ),
            eq(notificationSettings.notificationTime, currentTime)
          )
        );

      return result.filter(r => r.locationId && (r.smsEnabled || r.pushEnabled)) as Array<{
        userId: string;
        smsEnabled: boolean;
        pushEnabled: boolean;
        phoneNumber: string | null;
        locationId: number;
        locationName: string;
      }>;

    } catch (error) {
      console.error('Error querying users for notifications:', error);
      return [];
    }
  }

  private static async sendPushConditions(userId: string, locationId: number, locationName: string): Promise<boolean> {
    try {
      // Get current conditions for the location
      const conditions = await storage.getSurfConditions(locationId);
      if (!conditions) {
        console.error(`No conditions found for location ${locationId}`);
        return false;
      }

      const success = await pushNotificationService.sendSurfConditionNotification(
        userId,
        locationName,
        {
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
        }
      );

      return success;
    } catch (error) {
      console.error('Error sending push conditions:', error);
      return false;
    }
  }

  static async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const settings = await storage.getNotificationSettings(userId);
      if (!settings || !settings.locationId) {
        console.log('User does not have complete notification settings');
        return false;
      }

      const promises: Promise<boolean>[] = [];
      let hasAnySettings = false;

      // Send test SMS if enabled
      if (settings.smsEnabled && settings.phoneNumber) {
        hasAnySettings = true;
        console.log(`📱 Sending test SMS to ${settings.phoneNumber}`);
        promises.push(
          SMSService.sendDailyConditions(userId, settings.phoneNumber, settings.locationId)
            .then(success => {
              if (success) {
                console.log(`✅ Test SMS sent to ${settings.phoneNumber}`);
              } else {
                console.error(`❌ Failed to send test SMS to ${settings.phoneNumber}`);
              }
              return success;
            })
        );
      }

      // Send test push notification if enabled
      if (settings.pushEnabled) {
        hasAnySettings = true;
        console.log(`🔔 Sending test push notification to user ${userId}`);
        promises.push(
          pushNotificationService.sendTestNotificationToUser(userId)
            .then(success => {
              if (success) {
                console.log(`✅ Test push notification sent to user ${userId}`);
              } else {
                console.error(`❌ Failed to send test push notification to user ${userId}`);
              }
              return success;
            })
        );
      }

      if (!hasAnySettings) {
        console.log('User does not have SMS or push notifications enabled');
        return false;
      }

      // Wait for all test notifications and return true if any succeeded
      const results = await Promise.all(promises);
      return results.some(result => result);

    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}