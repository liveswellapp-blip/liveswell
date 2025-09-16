import webpush from 'web-push';
import { storage } from './storage';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

class PushNotificationService {
  constructor() {
    this.setupWebPush();
  }

  private setupWebPush() {
    // Get VAPID keys from environment variables
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    // Generate ephemeral keys for development if not provided
    if (!publicKey || !privateKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required in production');
      }
      
      console.warn('[WARNING] Using ephemeral VAPID keys for development. Push notifications will not persist across server restarts.');
      
      // Generate temporary keys for development
      const vapidKeys = webpush.generateVAPIDKeys();
      process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
      process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    }

    webpush.setVapidDetails(
      'mailto:admin@liveswell.app',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    
    console.log('[INFO] Push notification service initialized with VAPID keys');
  }

  /**
   * Send push notification to a specific subscription
   */
  async sendNotificationToSubscription(
    subscriptionData: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; shouldDelete: boolean }> {
    try {
      const pushSubscription = {
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        },
      };

      const payloadString = JSON.stringify(payload);
      
      const result = await webpush.sendNotification(pushSubscription, payloadString);
      
      console.log('[INFO] Push notification sent successfully', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        statusCode: result.statusCode,
        payloadSize: payloadString.length,
      });
      
      return { success: true, shouldDelete: false };
    } catch (error: any) {
      console.error('[ERROR] Failed to send push notification', {
        error: error.message,
        statusCode: error.statusCode,
        endpoint: subscriptionData.endpoint?.substring(0, 50) + '...',
      });

      // Only mark for deletion on 404/410 (expired/invalid subscription)
      const shouldDelete = error.statusCode === 410 || error.statusCode === 404;
      
      if (shouldDelete) {
        console.log('[INFO] Subscription expired or invalid, marking for cleanup');
      }

      return { success: false, shouldDelete };
    }
  }

  /**
   * Send notification to a user by user ID
   */
  async sendNotificationToUser(userId: string, payload: PushNotificationPayload): Promise<number> {
    try {
      const subscriptions = await storage.getPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log('[INFO] No push subscriptions found for user', { userId });
        return 0;
      }

      let successCount = 0;
      const cleanupEndpoints: string[] = [];

      for (const subscription of subscriptions) {
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        };

        const result = await this.sendNotificationToSubscription(subscriptionData, payload);
        
        if (result.success) {
          successCount++;
        } 
        
        // Only mark for cleanup if explicitly marked for deletion (404/410 errors)
        if (result.shouldDelete) {
          cleanupEndpoints.push(subscription.endpoint);
        }
      }

      // Clean up expired/invalid subscriptions (only for 404/410 errors)
      for (const endpoint of cleanupEndpoints) {
        try {
          await storage.removePushSubscription(userId, endpoint);
          console.log('[INFO] Cleaned up expired push subscription', { endpoint: endpoint.substring(0, 50) + '...' });
        } catch (error) {
          console.error('[ERROR] Failed to clean up expired subscription', { endpoint: endpoint.substring(0, 50) + '...', error });
        }
      }

      console.log('[INFO] Push notification batch completed', {
        userId,
        totalSubscriptions: subscriptions.length,
        successCount,
        cleanedUp: cleanupEndpoints.length,
      });

      return successCount;
    } catch (error) {
      console.error('[ERROR] Failed to send push notifications to user', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      return 0;
    }
  }

  /**
   * Send test notification to a user
   */
  async sendTestNotificationToUser(userId: string): Promise<boolean> {
    const payload: PushNotificationPayload = {
      title: '🌊 LiveSwell Test',
      body: 'Your push notifications are working! You\'ll receive daily surf updates.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: false,
    };

    const successCount = await this.sendNotificationToUser(userId, payload);
    return successCount > 0;
  }

  /**
   * Send surf condition notification to a user
   */
  async sendSurfConditionNotification(
    userId: string,
    locationName: string,
    conditions: {
      waveHeight: string;
      wavePeriod: number;
      waveDirection: string;
      windSpeed: string;
      windDirection: string;
      waterTemp: string;
      tideHeight: string;
      tideStatus: string;
      uvIndex: number;
      sunrise: string;
      sunset: string;
    }
  ): Promise<boolean> {
    const payload: PushNotificationPayload = {
      title: `🌊 ${locationName} Surf Update`,
      body: `${conditions.waveHeight}ft @ ${conditions.wavePeriod}s ${conditions.waveDirection} • Wind: ${conditions.windSpeed}mph ${conditions.windDirection} • Water: ${conditions.waterTemp}°F`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `surf-conditions-${locationName.toLowerCase().replace(/\s+/g, '-')}`,
      requireInteraction: false,
      url: `/conditions/${locationName.toLowerCase().replace(/\s+/g, '-')}`,
    };

    const successCount = await this.sendNotificationToUser(userId, payload);
    return successCount > 0;
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    if (!process.env.VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured');
    }
    return process.env.VAPID_PUBLIC_KEY;
  }
}

export const pushNotificationService = new PushNotificationService();