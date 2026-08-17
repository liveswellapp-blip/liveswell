/**
 * user-audit.ts
 *
 * Assembles a chronological activity timeline for a user from existing
 * tables (users, userAlerts, alertTriggerLog, favorites, verifiedPhones)
 * plus the append-only user_events table which records deletion events
 * (alert_deleted, spot_unfavorited) that would otherwise leave no trace.
 */
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  userAlerts,
  favorites as favoritesTable,
  locations as locationsTable,
  alertTriggerLog,
  verifiedPhones,
  userEvents,
  type User,
} from "@shared/schema";

export interface AuditEvent {
  type: string;
  timestamp: string;
  description: string;
  meta?: Record<string, unknown>;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)}` : "+1";
  return `${country} •••• ${last4}`;
}

/**
 * Returns ALL audit events for the user, sorted newest-first.
 * Pagination is applied by the caller so `total` always reflects the
 * complete available history — no silent truncation.
 */
export async function assembleUserAuditEvents(user: User): Promise<AuditEvent[]> {
  const userId = user.id;
  const events: AuditEvent[] = [];

  // Account created
  if (user.createdAt) {
    events.push({
      type: "account_created",
      timestamp: new Date(user.createdAt).toISOString(),
      description: "Account created",
    });
  }

  // Alerts (created / updated) — include location names
  const alertRows = await db
    .select({
      id: userAlerts.id,
      label: userAlerts.label,
      deliveryChannels: userAlerts.deliveryChannels,
      createdAt: userAlerts.createdAt,
      updatedAt: userAlerts.updatedAt,
      locationName: locationsTable.name,
    })
    .from(userAlerts)
    .leftJoin(locationsTable, eq(userAlerts.locationId, locationsTable.id))
    .where(eq(userAlerts.userId, userId));

  for (const a of alertRows) {
    const name = a.label || a.locationName || `Alert #${a.id}`;
    const channels = (a.deliveryChannels ?? []).join(", ") || "no channels";
    if (a.createdAt) {
      events.push({
        type: "alert_created",
        timestamp: new Date(a.createdAt).toISOString(),
        description: `Alert created: ${name}${a.locationName ? ` at ${a.locationName}` : ""} (${channels})`,
        meta: { alertId: a.id },
      });
    }
    if (
      a.updatedAt &&
      a.createdAt &&
      new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime() > 60_000
    ) {
      events.push({
        type: "alert_updated",
        timestamp: new Date(a.updatedAt).toISOString(),
        description: `Alert updated: ${name}${a.locationName ? ` at ${a.locationName}` : ""} (${channels})`,
        meta: { alertId: a.id },
      });
    }
  }

  // Alert fired events (via the user's alert IDs) — full history, no cap.
  const alertIds = alertRows.map((a) => a.id);
  if (alertIds.length > 0) {
    const fired = await db
      .select({
        alertId: alertTriggerLog.alertId,
        firedAt: alertTriggerLog.firedAt,
        triggerReason: alertTriggerLog.triggerReason,
      })
      .from(alertTriggerLog)
      .where(inArray(alertTriggerLog.alertId, alertIds))
      .orderBy(desc(alertTriggerLog.firedAt));

    const alertById = new Map(alertRows.map((a) => [a.id, a]));
    for (const f of fired) {
      const a = alertById.get(f.alertId);
      const name = a ? a.label || a.locationName || `Alert #${a.id}` : `Alert #${f.alertId}`;
      events.push({
        type: "alert_fired",
        timestamp: new Date(f.firedAt).toISOString(),
        description: `Alert fired: ${name}${a?.locationName ? ` at ${a.locationName}` : ""}`,
        meta: { alertId: f.alertId, reason: f.triggerReason },
      });
    }
  }

  // Favorites
  const favRows = await db
    .select({
      addedAt: favoritesTable.addedAt,
      locationName: locationsTable.name,
    })
    .from(favoritesTable)
    .leftJoin(locationsTable, eq(favoritesTable.locationId, locationsTable.id))
    .where(eq(favoritesTable.userId, userId));

  for (const f of favRows) {
    if (f.addedAt) {
      events.push({
        type: "spot_favorited",
        timestamp: new Date(f.addedAt).toISOString(),
        description: `Favorited ${f.locationName ?? "a spot"}`,
      });
    }
  }

  // Phone verifications (masked)
  const phones = await db
    .select({ phone: verifiedPhones.phone, verifiedAt: verifiedPhones.verifiedAt })
    .from(verifiedPhones)
    .where(eq(verifiedPhones.userId, userId));

  for (const p of phones) {
    events.push({
      type: "phone_verified",
      timestamp: new Date(p.verifiedAt).toISOString(),
      description: `Phone verified: ${maskPhone(p.phone)}`,
    });
  }

  // Deletion events recorded by user-events.ts at mutation time
  const storedEvents = await db
    .select({
      type: userEvents.type,
      payload: userEvents.payload,
      createdAt: userEvents.createdAt,
    })
    .from(userEvents)
    .where(eq(userEvents.userId, userId))
    .orderBy(desc(userEvents.createdAt));

  for (const e of storedEvents) {
    const payload = (e.payload ?? {}) as Record<string, unknown>;
    let description = e.type;
    if (e.type === "alert_deleted") {
      const name =
        (payload.label as string | null) ||
        (payload.locationName as string | null) ||
        `Alert #${payload.alertId}`;
      const loc = payload.locationName ? ` at ${payload.locationName}` : "";
      description = `Alert deleted: ${name}${loc}`;
    } else if (e.type === "spot_unfavorited") {
      description = `Unfavorited ${(payload.locationName as string | null) ?? "a spot"}`;
    }
    events.push({
      type: e.type,
      timestamp: new Date(e.createdAt).toISOString(),
      description,
      meta: Object.keys(payload).length > 0 ? payload : undefined,
    });
  }

  // Pro status (current state — no historical table, so surface the
  // grant as of the last user update if the user is Pro)
  if (user.isPro) {
    const source = user.isTestAccount
      ? "test account"
      : user.whopMembershipId
        ? "Whop subscription"
        : "comp";
    events.push({
      type: "pro_granted",
      timestamp: new Date(user.updatedAt ?? user.createdAt ?? new Date()).toISOString(),
      description: `Pro access active (${source})`,
    });
  }

  events.sort((x, y) => y.timestamp.localeCompare(x.timestamp));
  return events;
}

export interface PaginatedAudit {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Slices a full newest-first event list into the requested page.
 * `total` is always the complete history length, so clients can page
 * through every event: page * pageSize >= total ⇒ no more pages.
 */
export function paginateAuditEvents(
  events: AuditEvent[],
  page: number,
  pageSize: number,
): PaginatedAudit {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const start = (safePage - 1) * safeSize;
  return {
    events: events.slice(start, start + safeSize),
    total: events.length,
    page: safePage,
    pageSize: safeSize,
  };
}
