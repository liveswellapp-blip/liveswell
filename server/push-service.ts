import webpush from 'web-push';
import { storage } from './storage';
import { trackPushResult } from './monitoring';
import { apnsService } from './apns-service';

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
  /** Stores the init error when VAPID keys are missing or invalid. */
  private initError: Error | null = null;

  constructor() {
    this.setupWebPush();
  }

  /**
   * Returns true when the service initialised successfully and push
   * notifications can be delivered.
   */
  isOperational(): boolean {
    return this.initError === null;
  }

  /**
   * Returns the initialisation error, or null when healthy.
   * Used by the push health monitor to report the root cause.
   */
  getInitError(): Error | null {
    return this.initError;
  }

  private setupWebPush() {
    // Get VAPID keys from environment variables
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    // Generate ephemeral keys for development if not provided
    if (!publicKey || !privateKey) {
      if (process.env.NODE_ENV === 'production') {
        // In production, record the error but do NOT throw — the server must
        // stay up long enough for the health monitor to send an alert email.
        const err = new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required in production');
        this.initError = err;
        console.error('[ERROR] Push notification service: VAPID keys missing in production. Push notifications are disabled until keys are configured.');
        return;
      }
      
      console.warn('[WARNING] Using ephemeral VAPID keys for development. Push notifications will not persist across server restarts.');
      
      // Generate temporary keys for development
      const vapidKeys = webpush.generateVAPIDKeys();
      process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
      process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    }

    try {
      webpush.setVapidDetails(
        'mailto:admin@liveswell.app',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );
      console.log('[INFO] Push notification service initialized with VAPID keys');
    } catch (err) {
      // webpush.setVapidDetails throws for malformed keys — record, don't crash.
      this.initError = err instanceof Error ? err : new Error(String(err));
      console.error('[ERROR] Push notification service: VAPID key validation failed —', this.initError.message);
    }
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
      
      trackPushResult('sent');
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
        trackPushResult('cleanedUp');
      } else {
        trackPushResult('failed');
      }

      return { success: false, shouldDelete };
    }
  }

  /**
   * Send notification to a user by user ID (web-push / VAPID).
   * Returns the total delivery count across all web-push subscriptions.
   */
  async sendNotificationToUser(userId: string, payload: PushNotificationPayload): Promise<number> {
    let successCount = 0;

    // ── Web-push (VAPID) ──────────────────────────────────────────────────────
    try {
      const subscriptions = await storage.getPushSubscriptions(userId);
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
        if (result.success) successCount++;
        if (result.shouldDelete) cleanupEndpoints.push(subscription.endpoint);
      }

      for (const endpoint of cleanupEndpoints) {
        try {
          await storage.removePushSubscription(userId, endpoint);
          console.log('[INFO] Cleaned up expired push subscription', { endpoint: endpoint.substring(0, 50) + '...' });
        } catch (error) {
          console.error('[ERROR] Failed to clean up expired subscription', { endpoint: endpoint.substring(0, 50) + '...', error });
        }
      }

      if (subscriptions.length > 0) {
        console.log('[INFO] Web-push batch completed', {
          userId,
          totalSubscriptions: subscriptions.length,
          successCount,
          cleanedUp: cleanupEndpoints.length,
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to send web-push notifications to user', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }

    // ── APNs (native iOS) ─────────────────────────────────────────────────────
    if (apnsService.isOperational()) {
      try {
        const apnsCount = await apnsService.sendToUser(userId, {
          title: payload.title,
          body: payload.body,
          url: payload.url,
        });
        successCount += apnsCount;
      } catch (error) {
        console.error('[ERROR] APNs delivery failed for user', { userId, error });
      }
    }

    return successCount;
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
   * Send a condition-triggered alert push notification to a user
   */
  async sendCustomNotification(userId: string, title: string, body: string): Promise<boolean> {
    const payload: PushNotificationPayload = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `condition-alert-${Date.now()}`,
      requireInteraction: true,
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