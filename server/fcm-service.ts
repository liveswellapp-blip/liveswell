/**
 * FCM (Firebase Cloud Messaging) delivery for native Android.
 *
 * Required environment variables (all optional — service gracefully no-ops when absent):
 *   FIREBASE_PROJECT_ID    — Firebase project ID (e.g. liveswell-12345)
 *   FIREBASE_CLIENT_EMAIL  — Service-account client email
 *   FIREBASE_PRIVATE_KEY   — Service-account private key (PEM, with literal \n)
 *
 * Alternatively, set GOOGLE_APPLICATION_CREDENTIALS to point at a service-account
 * JSON file and omit the three vars above.
 */

import { storage as defaultStorage } from './storage';
import type { IStorage } from './storage';

interface FcmPayload {
  title: string;
  body: string;
  /** Deep-link URL opened when the user taps the notification. */
  url?: string;
}

export class FcmService {
  private messaging: any = null;
  private initError: string | null = null;
  private initPromise: Promise<void>;
  /** Overridable in tests to inject a mock storage. */
  _storage: Pick<IStorage, 'getFcmDeviceTokens' | 'removeFcmDeviceToken'> = defaultStorage;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

    const hasEnvCreds = projectId && clientEmail && privateKey;
    const hasADC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!hasEnvCreds && !hasADC) {
      this.initError =
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required for native Android push.';
      console.warn('[FCM] Credentials not configured — native Android push is disabled.');
      return;
    }

    try {
      // Dynamic import keeps this ESM-compatible
      const admin = await import('firebase-admin');

      // Avoid re-initialising if a default app already exists (e.g. in tests)
      let app: any;
      if (admin.apps.length > 0) {
        app = admin.app();
      } else if (hasEnvCreds) {
        // Use explicit service-account credentials from env vars
        app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            // Allow both literal newlines and escaped \n in the key string
            privateKey: privateKey!.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        // Fall back to ADC (Application Default Credentials) via key file
        app = admin.initializeApp();
      }

      this.messaging = admin.messaging(app);
      console.log('[FCM] Service initialised');
    } catch (err) {
      this.initError = err instanceof Error ? err.message : String(err);
      console.error('[FCM] Initialisation failed:', this.initError);
    }
  }

  isOperational(): boolean {
    return this.messaging !== null;
  }

  getInitError(): string | null {
    return this.initError;
  }

  /**
   * Send a notification to a single FCM registration token.
   * Returns { success, shouldDelete } — shouldDelete is true when the token is
   * no longer valid (unregistered / not found).
   */
  async sendToToken(
    registrationToken: string,
    payload: FcmPayload,
  ): Promise<{ success: boolean; shouldDelete: boolean }> {
    // Ensure init has completed (relevant for the first call after startup)
    await this.initPromise;

    if (!this.messaging) {
      return { success: false, shouldDelete: false };
    }

    const message = {
      token: registrationToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.url ? { url: payload.url } : undefined,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
        },
      },
    };

    try {
      await this.messaging.send(message);
      return { success: true, shouldDelete: false };
    } catch (err: any) {
      const code: string = err?.code ?? err?.errorInfo?.code ?? '';
      // These FCM error codes indicate a permanently invalid token
      const shouldDelete =
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument';
      if (shouldDelete) {
        console.log(`[FCM] Stale token (${code}), marking for cleanup.`);
      } else {
        console.error('[FCM] Delivery failed:', code || err);
      }
      return { success: false, shouldDelete };
    }
  }

  /**
   * Send a push notification to all registered FCM tokens for a user.
   * Returns the number of successful deliveries.
   */
  async sendToUser(userId: string, payload: FcmPayload): Promise<number> {
    await this.initPromise;
    if (!this.messaging) return 0;

    const tokens = await this._storage.getFcmDeviceTokens(userId);
    if (tokens.length === 0) return 0;

    let successCount = 0;
    const toDelete: string[] = [];

    for (const { deviceToken } of tokens) {
      const result = await this.sendToToken(deviceToken, payload);
      if (result.success) successCount++;
      if (result.shouldDelete) toDelete.push(deviceToken);
    }

    // Prune invalid tokens
    for (const token of toDelete) {
      try {
        await this._storage.removeFcmDeviceToken(userId, token);
      } catch { /* best-effort */ }
    }

    console.log(`[FCM] Delivered ${successCount}/${tokens.length} notifications to user ${userId}`);
    return successCount;
  }

  /**
   * Send a test notification to all registered Android devices for a user.
   */
  async sendTestToUser(userId: string): Promise<boolean> {
    const count = await this.sendToUser(userId, {
      title: '🌊 LiveSwell Test',
      body: "Your Android push notifications are working! You'll receive surf alerts natively.",
    });
    return count > 0;
  }
}

export const fcmService = new FcmService();
