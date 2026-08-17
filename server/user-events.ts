/**
 * user-events.ts
 *
 * Lightweight append-only event recorder for mutations that delete rows and
 * would otherwise leave no trace in the admin audit timeline.
 *
 * Usage:
 *   import { recordUserEvent } from "./user-events";
 *   await recordUserEvent(userId, "alert_deleted", { alertId, label, locationName });
 *
 * Errors are swallowed so a logging failure never blocks the primary mutation.
 */
import { db } from "./db";
import { userEvents } from "@shared/schema";

export async function recordUserEvent(
  userId: string,
  type: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(userEvents).values({ userId, type, payload: payload ?? null });
  } catch (err) {
    console.error(`[user-events] Failed to record event "${type}" for user ${userId}:`, err);
  }
}
