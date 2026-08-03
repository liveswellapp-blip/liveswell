/**
 * sms-rate-limit.test.ts
 *
 * Verifies that DatabaseStorage.checkAndRecordInboundSmsRateLimit enforces the
 * 10-requests-per-10-minute inbound SMS rate limit.
 *
 * Tests hit the real Neon/PostgreSQL database so the actual drizzle queries,
 * advisory locks and SQL constraints are exercised.  Each test uses a unique
 * userId and cleans up its rows in afterEach so it leaves no residue.
 *
 * Run with:  npm test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseStorage } from "./storage";
import { db } from "./db";
import { smsRateLimits, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const store = new DatabaseStorage();

let testCounter = 0;

/** Generates a unique (userId, phone) pair per test invocation. */
function freshPair() {
  const n = ++testCounter;
  return {
    userId: `test-sms-rl-${Date.now()}-${n}`,
    phone: `+1555000${String(n).padStart(4, "0")}`,
  };
}

/**
 * Inserts `count` inbound rate-limit rows for the given (userId, phone) pair
 * with sentAt values inside the 10-minute window (i.e. "just now").
 */
async function seedRows(userId: string, phone: string, count: number): Promise<void> {
  const values = Array.from({ length: count }, () => ({
    userId,
    phone,
    limitType: "inbound" as const,
    sentAt: new Date(),
  }));
  await db.insert(smsRateLimits).values(values);
}

/**
 * Inserts `count` inbound rate-limit rows with sentAt values well outside the
 * 10-minute window (15 minutes ago) so they should NOT count toward the limit.
 */
async function seedOldRows(userId: string, phone: string, count: number): Promise<void> {
  const past = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
  const values = Array.from({ length: count }, () => ({
    userId,
    phone,
    limitType: "inbound" as const,
    sentAt: past,
  }));
  await db.insert(smsRateLimits).values(values);
}

// ---------------------------------------------------------------------------
// Fixtures — each test creates a minimal user row (required by the FK) and
// removes it plus any rate-limit rows in afterEach.
// ---------------------------------------------------------------------------

let currentUserId: string;
let currentPhone: string;

beforeEach(async () => {
  const pair = freshPair();
  currentUserId = pair.userId;
  currentPhone = pair.phone;

  // Insert a minimal users row so the FK constraint is satisfied.
  await db.insert(users).values({ id: currentUserId });
});

afterEach(async () => {
  // Remove rate-limit rows first (FK child), then the user row.
  await db
    .delete(smsRateLimits)
    .where(
      and(
        eq(smsRateLimits.userId, currentUserId),
        eq(smsRateLimits.phone, currentPhone),
      ),
    );
  await db.delete(users).where(eq(users.id, currentUserId));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkAndRecordInboundSmsRateLimit — under the limit", () => {
  it("returns true and records the row when the table has no prior entries", async () => {
    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(true);
  });

  it("returns true for the 10th call (last allowed request in the window)", async () => {
    // Pre-seed 9 rows so the next call is the 10th.
    await seedRows(currentUserId, currentPhone, 9);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(true);
  });

  it("records a new row when the request is allowed", async () => {
    await store.checkAndRecordInboundSmsRateLimit(currentUserId, currentPhone);

    const rows = await db
      .select()
      .from(smsRateLimits)
      .where(
        and(
          eq(smsRateLimits.userId, currentUserId),
          eq(smsRateLimits.phone, currentPhone),
          eq(smsRateLimits.limitType, "inbound"),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

describe("checkAndRecordInboundSmsRateLimit — at or over the limit", () => {
  it("returns false when 10 rows already exist within the window", async () => {
    await seedRows(currentUserId, currentPhone, 10);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(false);
  });

  it("does not insert a new row when the limit is reached", async () => {
    await seedRows(currentUserId, currentPhone, 10);

    await store.checkAndRecordInboundSmsRateLimit(currentUserId, currentPhone);

    const rows = await db
      .select()
      .from(smsRateLimits)
      .where(
        and(
          eq(smsRateLimits.userId, currentUserId),
          eq(smsRateLimits.phone, currentPhone),
          eq(smsRateLimits.limitType, "inbound"),
        ),
      );
    // Still exactly 10 — the blocked call must not have inserted anything.
    expect(rows).toHaveLength(10);
  });

  it("blocks the 11th call after 10 sequential allowed calls", async () => {
    // Make 10 calls through the function itself (no manual seeding).
    for (let i = 0; i < 10; i++) {
      const ok = await store.checkAndRecordInboundSmsRateLimit(
        currentUserId,
        currentPhone,
      );
      expect(ok).toBe(true);
    }

    // The 11th call must be blocked.
    const blocked = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(blocked).toBe(false);
  });
});

describe("checkAndRecordInboundSmsRateLimit — window expiry", () => {
  it("does not count rows older than 10 minutes toward the limit", async () => {
    // Seed 10 rows that are outside the window — they must be ignored.
    await seedOldRows(currentUserId, currentPhone, 10);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(true);
  });

  it("only counts in-window rows: 10 old + 9 recent = 9, so the next call is allowed", async () => {
    await seedOldRows(currentUserId, currentPhone, 10);
    await seedRows(currentUserId, currentPhone, 9);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(true);
  });

  it("blocks when in-window rows reach 10, even if expired rows also exist", async () => {
    await seedOldRows(currentUserId, currentPhone, 5);
    await seedRows(currentUserId, currentPhone, 10);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(false);
  });
});

describe("checkAndRecordInboundSmsRateLimit — isolation", () => {
  it("rate limit is per-(userId, phone): a different phone on the same user is independent", async () => {
    const otherPhone = `${currentPhone}9`;

    // Insert a separate user + seed rows for the other phone (needs its own user record
    // only if the same userId is used with a different phone — the FK is on userId, so
    // the same user row covers both phones).
    await seedRows(currentUserId, currentPhone, 10);

    // The other phone should not be affected.
    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      otherPhone,
    );
    expect(result).toBe(true);

    // Cleanup the extra phone's rows (currentPhone cleanup is handled by afterEach).
    await db
      .delete(smsRateLimits)
      .where(
        and(
          eq(smsRateLimits.userId, currentUserId),
          eq(smsRateLimits.phone, otherPhone),
        ),
      );
  });

  it("outbound rows for the same user and phone do not count toward the inbound limit", async () => {
    // Seed 10 'outbound' rows — these must not affect the inbound count.
    const outboundValues = Array.from({ length: 10 }, () => ({
      userId: currentUserId,
      phone: currentPhone,
      limitType: "outbound" as const,
      sentAt: new Date(),
    }));
    await db.insert(smsRateLimits).values(outboundValues);

    const result = await store.checkAndRecordInboundSmsRateLimit(
      currentUserId,
      currentPhone,
    );
    expect(result).toBe(true);

    // afterEach will clean up all rows for (currentUserId, currentPhone).
  });
});
