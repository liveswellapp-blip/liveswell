import cron from 'node-cron';
import { storage } from './storage';
import { SMSService } from './sms-service';
import { eq, and, ne } from 'drizzle-orm';
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

      // Get all users with SMS notifications enabled for this time
      const usersToNotify = await this.getUsersForNotification(currentTime);

      for (const user of usersToNotify) {
        console.log(`📱 Sending notification to ${user.phoneNumber} for ${user.locationName}`);
        
        const success = await SMSService.sendDailyConditions(
          user.userId,
          user.phoneNumber,
          user.locationId
        );

        if (success) {
          console.log(`✅ SMS sent to ${user.phoneNumber}`);
        } else {
          console.error(`❌ Failed to send SMS to ${user.phoneNumber}`);
        }
      }

    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  }

  private static async getUsersForNotification(currentTime: string): Promise<Array<{
    userId: string;
    phoneNumber: string;
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
          phoneNumber: notificationSettings.phoneNumber,
          locationId: notificationSettings.locationId,
          locationName: locations.name,
        })
        .from(notificationSettings)
        .innerJoin(locations, eq(locations.id, notificationSettings.locationId))
        .where(
          and(
            eq(notificationSettings.smsEnabled, true),
            eq(notificationSettings.notificationTime, currentTime),
            ne(notificationSettings.phoneNumber, null),
            ne(notificationSettings.locationId, null)
          )
        );

      return result.filter(r => r.phoneNumber && r.locationId) as Array<{
        userId: string;
        phoneNumber: string;
        locationId: number;
        locationName: string;
      }>;

    } catch (error) {
      console.error('Error querying users for notifications:', error);
      return [];
    }
  }

  static async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const settings = await storage.getNotificationSettings(userId);
      if (!settings?.smsEnabled || !settings.phoneNumber || !settings.locationId) {
        console.log('User does not have complete SMS settings');
        return false;
      }

      console.log(`📱 Sending test notification to ${settings.phoneNumber}`);
      
      const success = await SMSService.sendDailyConditions(
        userId,
        settings.phoneNumber,
        settings.locationId
      );

      if (success) {
        console.log(`✅ Test SMS sent to ${settings.phoneNumber}`);
      } else {
        console.error(`❌ Failed to send test SMS to ${settings.phoneNumber}`);
      }

      return success;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}