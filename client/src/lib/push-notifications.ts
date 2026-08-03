/**
 * Push Notification Utilities
 *
 * On iOS (Capacitor native shell): uses @capacitor/push-notifications to request
 * APNs permission and register the device token with the server.
 *
 * On Android (Capacitor native shell): uses @capacitor/push-notifications to
 * request FCM permission and register the FCM registration token with the server.
 *
 * On all other platforms (web): uses the Web Push / VAPID flow unchanged.
 */

import { apiRequest } from '@/lib/queryClient';

// Capacitor core is always available in the native shell; on plain web it no-ops.
// We import lazily to avoid bundling the native plugins on platforms that don't need them.
async function getCapacitor() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor;
  } catch {
    return null;
  }
}

async function getCapacitorPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch {
    return null;
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string;
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  // Public VAPID key - provided by the backend
  private readonly vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCeAE';

  // ─── Platform detection ──────────────────────────────────────────────────────

  /**
   * Returns true when running inside a native Capacitor iOS shell.
   */
  async isNativeIOS(): Promise<boolean> {
    const Capacitor = await getCapacitor();
    return !!(Capacitor?.isNativePlatform() && Capacitor?.getPlatform() === 'ios');
  }

  /**
   * Returns true when running inside a native Capacitor Android shell.
   */
  async isNativeAndroid(): Promise<boolean> {
    const Capacitor = await getCapacitor();
    return !!(Capacitor?.isNativePlatform() && Capacitor?.getPlatform() === 'android');
  }

  // ─── Initialisation ──────────────────────────────────────────────────────────

  async initialize(): Promise<boolean> {
    if (await this.isNativeIOS() || await this.isNativeAndroid()) {
      // Native iOS / Android: no service worker needed
      return true;
    }

    if (!this.isWebPushSupported()) {
      console.warn('Web push notifications are not supported in this browser');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // ─── Support checks ──────────────────────────────────────────────────────────

  isWebPushSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async isSupported(): Promise<boolean> {
    if (await this.isNativeIOS()) return true;
    if (await this.isNativeAndroid()) return true;
    return this.isWebPushSupported();
  }

  // ─── Permission ──────────────────────────────────────────────────────────────

  async getPermissionStatus(): Promise<NotificationPermission> {
    if (await this.isNativeIOS() || await this.isNativeAndroid()) {
      const PushNotifications = await getCapacitorPush();
      if (!PushNotifications) return 'denied';
      try {
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === 'granted') return 'granted';
        if (receive === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'denied';
      }
    }

    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (await this.isNativeIOS()) {
      const PushNotifications = await getCapacitorPush();
      if (!PushNotifications) return false;

      try {
        // Request APNs permission and register for remote notifications
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') return false;

        // Register with APNs — triggers the 'registration' event with the token
        await PushNotifications.register();
        return true;
      } catch (err) {
        console.error('[APNs] Permission / registration error:', err);
        return false;
      }
    }

    if (await this.isNativeAndroid()) {
      const PushNotifications = await getCapacitorPush();
      if (!PushNotifications) return false;

      try {
        // Request FCM permission and register for remote notifications
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') return false;

        // Register with FCM — triggers the 'registration' event with the token
        await PushNotifications.register();
        return true;
      } catch (err) {
        console.error('[FCM] Permission / registration error:', err);
        return false;
      }
    }

    if (!this.isWebPushSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // ─── Subscribe / unsubscribe ─────────────────────────────────────────────────

  /**
   * Subscribe to push notifications:
   * - iOS (native): requests APNs permission, obtains a device token, and
   *   registers it with the server via POST /api/push/apns-token.
   * - Android (native): requests FCM permission, obtains a registration token,
   *   and registers it with the server via POST /api/push/fcm-token.
   * - Web: registers a VAPID/web-push subscription as before.
   *
   * Returns a PushSubscriptionData on web success, or null (token was handled
   * separately) on iOS/Android, or null on failure.
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (await this.isNativeIOS()) {
      return this.subscribeNativeIOS();
    }
    if (await this.isNativeAndroid()) {
      return this.subscribeNativeAndroid();
    }
    return this.subscribeWebPush();
  }

  private async subscribeNativeIOS(): Promise<null> {
    const PushNotifications = await getCapacitorPush();
    if (!PushNotifications) return null;

    // Remove any stale listeners first
    await PushNotifications.removeAllListeners();

    return new Promise((resolve) => {
      let settled = false;
      const settle = (val: null) => {
        if (!settled) { settled = true; resolve(val); }
      };

      // Listen for the device token
      PushNotifications.addListener('registration', async (token) => {
        try {
          await this.saveApnsTokenToServer(token.value);
          console.log('[APNs] Device token registered with server');
        } catch (err) {
          console.error('[APNs] Failed to save token to server:', err);
        }
        settle(null);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[APNs] Registration error:', err);
        settle(null);
      });

      // Kick off the APNs registration flow
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register().catch((err) => {
            console.error('[APNs] register() failed:', err);
            settle(null);
          });
        } else {
          console.warn('[APNs] Permission not granted:', result.receive);
          settle(null);
        }
      }).catch((err) => {
        console.error('[APNs] requestPermissions() failed:', err);
        settle(null);
      });

      // Timeout after 15 s — APNs dialogs can be slow
      setTimeout(() => settle(null), 15_000);
    });
  }

  private async subscribeNativeAndroid(): Promise<null> {
    const PushNotifications = await getCapacitorPush();
    if (!PushNotifications) return null;

    // Remove any stale listeners first
    await PushNotifications.removeAllListeners();

    return new Promise((resolve) => {
      let settled = false;
      const settle = (val: null) => {
        if (!settled) { settled = true; resolve(val); }
      };

      // Listen for the FCM registration token
      PushNotifications.addListener('registration', async (token) => {
        try {
          await this.saveFcmTokenToServer(token.value);
          console.log('[FCM] Registration token registered with server');
        } catch (err) {
          console.error('[FCM] Failed to save token to server:', err);
        }
        settle(null);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[FCM] Registration error:', err);
        settle(null);
      });

      // Kick off the FCM registration flow
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register().catch((err) => {
            console.error('[FCM] register() failed:', err);
            settle(null);
          });
        } else {
          console.warn('[FCM] Permission not granted:', result.receive);
          settle(null);
        }
      }).catch((err) => {
        console.error('[FCM] requestPermissions() failed:', err);
        settle(null);
      });

      // Timeout after 15 s
      setTimeout(() => settle(null), 15_000);
    });
  }

  private async subscribeWebPush(): Promise<PushSubscriptionData | null> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered. Call initialize() first.');
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    try {
      const vapidKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dhKey: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        authKey: this.arrayBufferToBase64(subscription.getKey('auth')!),
        userAgent: navigator.userAgent,
      };

      await this.saveSubscriptionToServer(subscriptionData);
      return subscriptionData;
    } catch (error) {
      console.error('Failed to subscribe for web push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (await this.isNativeIOS() || await this.isNativeAndroid()) {
      // Best-effort: on sign-out the server removes all tokens for the user
      return true;
    }

    if (!this.swRegistration) return false;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await this.removeSubscriptionFromServer(subscription.endpoint);
        await subscription.unsubscribe();
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (await this.isNativeIOS()) {
      // On iOS, check if we have stored tokens on the server
      try {
        const resp = await apiRequest('/api/push/apns-tokens', { method: 'GET' });
        return Array.isArray(resp) && resp.length > 0;
      } catch {
        // Endpoint doesn't exist yet — fall back to permission check
        const status = await this.getPermissionStatus();
        return status === 'granted';
      }
    }

    if (await this.isNativeAndroid()) {
      // On Android, check if we have stored FCM tokens on the server
      try {
        const resp = await apiRequest('/api/push/fcm-tokens', { method: 'GET' });
        return Array.isArray(resp) && resp.length > 0;
      } catch {
        // Fall back to permission check
        const status = await this.getPermissionStatus();
        return status === 'granted';
      }
    }

    if (!this.swRegistration) return false;
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (await this.isNativeIOS() || await this.isNativeAndroid()) return null;
    if (!this.swRegistration) return null;
    try {
      return await this.swRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  // ─── Server communication ────────────────────────────────────────────────────

  async saveApnsTokenToServer(deviceToken: string): Promise<void> {
    await apiRequest('/api/push/apns-token', {
      method: 'POST',
      body: { deviceToken },
    });
  }

  async removeApnsTokenFromServer(deviceToken: string): Promise<void> {
    await apiRequest('/api/push/apns-token', {
      method: 'DELETE',
      body: { deviceToken },
    });
  }

  async saveFcmTokenToServer(deviceToken: string): Promise<void> {
    await apiRequest('/api/push/fcm-token', {
      method: 'POST',
      body: { deviceToken },
    });
  }

  async removeFcmTokenFromServer(deviceToken: string): Promise<void> {
    await apiRequest('/api/push/fcm-token', {
      method: 'DELETE',
      body: { deviceToken },
    });
  }

  private async saveSubscriptionToServer(subscriptionData: PushSubscriptionData): Promise<void> {
    await apiRequest('/api/push/subscribe', {
      method: 'POST',
      body: subscriptionData,
    });
  }

  private async removeSubscriptionFromServer(endpoint: string): Promise<void> {
    await apiRequest('/api/push/unsubscribe', {
      method: 'POST',
      body: { endpoint },
    });
  }

  async sendTestNotification(): Promise<boolean> {
    try {
      const response = await apiRequest('/api/push/test', { method: 'POST' });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const pushNotifications = new PushNotificationService();
