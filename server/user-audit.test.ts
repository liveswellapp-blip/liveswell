/**
 * user-audit.test.ts
 *
 * Verifies the admin audit-log assembly (assembleUserAuditEvents):
 *  - includes account creation, alert created/updated, alert fired,
 *    favorites, and masked phone verification events
 *  - returns the FULL trigger history (>500 rows, no silent truncation)
 *  - sorts newest-first so caller-side pagination is deterministic
 *
 * Tests hit the real Neon/PostgreSQL database. Each test uses a unique
 * userId and cleans up its rows in afterAll.
 *
 * Run with:  npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import {
  users,
  userAlerts,
  alertTriggerLog,
  favorites,
  locations,
  verifiedPhones,
} from "../shared/schema";
import { eq } from "drizzle-orm";
import { assembleUserAuditEvents, paginateAuditEvents, maskPhone } from "./user-audit";

const userId = `test-audit-${Date.now()}`;
let alertId: number;
let locationId: number;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ id: userId, email: `${userId}@example.com` })
    .returning();
  expect(user.id).toBe(userId);

  const [loc] = await db
    .insert(locations)
    .values({
      name: "Audit Test Break",
      city: "Testville",
      country: "US",
      latitude: "10.00000000",
      longitude: "20.00000000",
    })
    .returning();
  locationId = loc.id;

  const [alert] = await db
    .insert(userAlerts)
    .values({
      userId,
      locationId,
      label: "Test alert",
      deliveryChannels: ["email"],
    })
    .returning();
  alertId = alert.id;

  // 550 trigger rows — more than the old 500 cap
  const now = Date.now();
  const rows = Array.from({ length: 550 }, (_, i) => ({
    alertId,
    firedAt: new Date(now - i * 60_000),
    triggerReason: `test-${i}`,
  }));
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(alertTriggerLog).values(rows.slice(i, i + 100));
  }

  await db.insert(favorites).values({ userId, locationId });
  await db.insert(verifiedPhones).values({
    userId,
    phone: `+1904555${String(now).slice(-4)}`,
  });
}, 120_000);

afterAll(async () => {
  await db.delete(alertTriggerLog).where(eq(alertTriggerLog.alertId, alertId));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  await db.delete(verifiedPhones).where(eq(verifiedPhones.userId, userId));
  await db.delete(userAlerts).where(eq(userAlerts.userId, userId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(users).where(eq(users.id, userId));
}, 60_000);

describe("assembleUserAuditEvents", () => {
  it("returns the full history without truncating trigger events, sorted newest-first", async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const events = await assembleUserAuditEvents(user);

    const fired = events.filter((e) => e.type === "alert_fired");
    expect(fired.length).toBe(550); // no silent 500-row cap

    // account_created + alert_created + 550 fired + favorite + phone_verified
    expect(events.length).toBeGreaterThanOrEqual(554);

    // Newest-first ordering
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].timestamp >= events[i].timestamp).toBe(true);
    }

    // Event types present
    const types = new Set(events.map((e) => e.type));
    expect(types.has("account_created")).toBe(true);
    expect(types.has("alert_created")).toBe(true);
    expect(types.has("spot_favorited")).toBe(true);
    expect(types.has("phone_verified")).toBe(true);

    // Phone is masked — raw digits beyond last 4 never appear
    const phoneEvent = events.find((e) => e.type === "phone_verified")!;
    expect(phoneEvent.description).toContain("••••");
    expect(phoneEvent.description).not.toContain("904555");

    // Caller-side pagination is deterministic: slicing pages never loses events
    const pageSize = 20;
    const page1 = events.slice(0, pageSize);
    const page2 = events.slice(pageSize, pageSize * 2);
    expect(page1.length).toBe(pageSize);
    expect(page2.length).toBe(pageSize);
    expect(page1[pageSize - 1].timestamp >= page2[0].timestamp).toBe(true);
  }, 120_000);
});

describe("paginateAuditEvents — Load more walks the entire history", () => {
  it("sequential pages reach every event past 100 and terminate", async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const events = await assembleUserAuditEvents(user);
    expect(events.length).toBeGreaterThan(500);

    // Simulate the client's Load more loop: page=1,2,3… pageSize=20,
    // continuing while page * pageSize < total (getNextPageParam logic).
    const pageSize = 20;
    const collected: typeof events = [];
    let page = 1;
    let guard = 0;
    for (;;) {
      const res = paginateAuditEvents(events, page, pageSize);
      expect(res.total).toBe(events.length); // total never truncated
      collected.push(...res.events);
      if (res.page * res.pageSize >= res.total) break; // Load more disappears
      page = res.page + 1;
      if (++guard > 1000) throw new Error("pagination did not terminate");
    }

    // Every event was reachable, in order, with no duplicates or gaps
    expect(collected.length).toBe(events.length);
    expect(collected.map((e) => e.timestamp)).toEqual(events.map((e) => e.timestamp));

    // Events beyond index 100 are reachable (the old cap regression)
    expect(collected[100]).toBeDefined();
    expect(collected[549]).toBeDefined();

    // Requesting a page past the end returns empty, not an error
    const past = paginateAuditEvents(events, Math.ceil(events.length / pageSize) + 1, pageSize);
    expect(past.events.length).toBe(0);
    expect(past.total).toBe(events.length);
  }, 120_000);
});

describe("maskPhone", () => {
  it("masks all but the last four digits", () => {
    expect(maskPhone("+19045551234")).toBe("+1 •••• 1234");
    expect(maskPhone("9045551234")).toBe("+1 •••• 1234");
    expect(maskPhone("+449045551234")).toBe("+44 •••• 1234");
  });
});
