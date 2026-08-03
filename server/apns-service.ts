/**
 * APNs (Apple Push Notification service) delivery for native iOS.
 *
 * Required environment variables (all optional — service gracefully no-ops when absent):
 *   APNS_KEY       — contents of the .p8 signing key from Apple Developer portal
 *   APNS_KEY_ID    — 10-character Key ID (e.g. ABC123DEFG)
 *   APNS_TEAM_ID   — 10-character Team ID from Apple Developer account
 *
 * The bundle ID is read from APNS_BUNDLE_ID (defaults to 'com.liveswell.app').
 * By default the service targets the APNs production gateway; set
 * APNS_SANDBOX=true to target the sandbox gateway instead.
 */

import { ApnsClient, Notification } from 'apns2';
import { storage as defaultStorage } from './storage';
import type { IStorage } from './storage';

const BUNDLE_ID = process.env.APNS_BUNDLE_ID ?? 'com.liveswell.app';

interface ApnsPayload {
  title: string;
  body: string;
  /** Deep-link URL opened when the user taps the notification. */
  url?: string;
  /** Badge count (pass 0 to clear). */
  badge?: number;
}

export class ApnsService {
  private client: ApnsClient | null = null;
  private initError: string | null = null;
  /** Overridable in tests to inject a mock storage. */
  _storage: Pick<IStorage, 'getApnsDeviceTokens' | 'removeApnsDeviceToken'> = defaultStorage;

  constructor() {
    this.init();
  }

  private init() {
    const key    = process.env.APNS_KEY;
    const keyId  = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;

    if (!key || !keyId || !teamId) {
      this.initError = 'APNS_KEY, APNS_KEY_ID, and APNS_TEAM_ID are required for native iOS push.';
      console.warn('[APNs] Credentials not configured — native iOS push is disabled.');
      return;
    }

    try {
      const useSandbox = process.env.APNS_SANDBOX === 'true';
      this.client = new ApnsClient({
        team: teamId,
        keyId,
        signingKey: key,
        defaultTopic: BUNDLE_ID,
        requestTimeout: 10_000,
        // apns2 v12 uses 'host' to select production vs sandbox
        host: useSandbox
          ? 'api.sandbox.push.apple.com'
          : 'api.push.apple.com',
      });
      console.log(`[APNs] Service initialised (${useSandbox ? 'sandbox' : 'production'}, bundle: ${BUNDLE_ID})`);
    } catch (err) {
      this.initError = err instanceof Error ? err.message : String(err);
      console.error('[APNs] Initialisation failed:', this.initError);
    }
  }

  isOperational(): boolean {
    return this.client !== null;
  }

  getInitError(): string | null {
    return this.initError;
  }

  /**
   * Send a notification to a single device token.
   * Returns true on success, false on delivery failure.
   * Tokens that Apple reports as invalid (BadDeviceToken / Unregistered) are
   * returned with shouldDelete=true so the caller can prune them.
   */
  async sendToToken(
    deviceToken: string,
    payload: ApnsPayload,
  ): Promise<{ success: boolean; shouldDelete: boolean }> {
    if (!this.client) {
      return { success: false, shouldDelete: false };
    }

    try {
      const notification = new Notification(deviceToken, {
        alert: { title: payload.title, body: payload.body },
        badge: payload.badge,
        sound: 'default',
        data: payload.url ? { url: payload.url } : undefined,
      });

      await this.client.send(notification);
      return { success: true, shouldDelete: false };
    } catch (err: any) {
      const reason: string = err?.reason ?? '';
      const shouldDelete = reason === 'BadDeviceToken' || reason === 'Unregistered';
      if (shouldDelete) {
        console.log(`[APNs] Stale token (${reason}), marking for cleanup.`);
      } else {
        console.error('[APNs] Delivery failed:', reason || err);
      }
      return { success: false, shouldDelete };
    }
  }

  /**
   * Send a push notification to all registered APNs tokens for a user.
   * Returns the number of successful deliveries.
   */
  async sendToUser(userId: string, payload: ApnsPayload): Promise<number> {
    if (!this.client) return 0;

    const tokens = await this._storage.getApnsDeviceTokens(userId);
    if (tokens.length === 0) return 0;

    let successCount = 0;
    const toDelete: string[] = [];

    for (const { deviceToken } of tokens) {
      const result = await this.sendToToken(deviceToken, payload);
      if (result.success) {
        successCount++;
      }
      if (result.shouldDelete) {
        toDelete.push(deviceToken);
      }
    }

    // Prune invalid tokens
    for (const token of toDelete) {
      try {
        await this._storage.removeApnsDeviceToken(userId, token);
      } catch { /* best-effort */ }
    }

    console.log(`[APNs] Delivered ${successCount}/${tokens.length} notifications to user ${userId}`);
    return successCount;
  }

  /**
   * Send a test notification to all registered iOS devices for a user.
   */
  async sendTestToUser(userId: string): Promise<boolean> {
    const count = await this.sendToUser(userId, {
      title: '🌊 LiveSwell Test',
      body: "Your iOS push notifications are working! You'll receive surf alerts natively.",
    });
    return count > 0;
  }
}

export const apnsService = new ApnsService();
