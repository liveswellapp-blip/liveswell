/**
 * email-unsubscribe-roundtrip.test.ts
 *
 * Integration tests for the email unsubscribe / re-enable round-trip exercised
 * via DatabaseStorage methods.  All tests hit the real Neon/PostgreSQL database
 * so actual drizzle queries and Postgres constraints are exercised.
 *
 * Covered scenarios:
 *  1. disableEmailForAlert idempotency — calling it twice produces 'ok' both
 *     times and emailUnsubscribed stays true.
 *  2. updateUserAlert clears emailUnsubscribed when deliveryChannels re-adds 'email'.
 *  3. getUserAlerts returns emailUnsubscribed in the response payload.
 *  4. disableEmailForAlert returns 'email_mismatch' when the user's account has
 *     no email address (userEmail is null), so callers never silently succeed.
 *
 * Run with:  npm test
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { DatabaseStorage } from "./storage";
import { db } from "./db";
import { users, locations, userAlerts, adminSettings } from "../shared/schema";
import { eq, and, like, sql } from "drizzle-orm";

// Ensure admin_settings exists in the test DB (it is created by migration 0009;
// if that migration has not yet been applied to this DB instance we create it
// here so the tests are self-contained).
beforeAll(async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key         text PRIMARY KEY,
      value       text NOT NULL,
      updated_at  timestamp DEFAULT now() NOT NULL
    )
  `);
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const store = new DatabaseStorage();

let counter = 0;

/** Returns a fresh, unique user ID for each test. */
function freshUserId(): string {
  return `test-email-unsub-${Date.now()}-${++counter}`;
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal user row.
 * Pass `email: null` to simulate an account that has no email address.
 */
async function createUser(userId: string, email: string | null): Promise<void> {
  await db.insert(users).values({ id: userId, email });
}

/**
 * Creates a minimal location row and returns its ID.
 * Uses a unique name per test run to avoid conflicts.
 */
async function createLocation(): Promise<number> {
  const tag = `${Date.now()}-${counter}`;
  const [loc] = await db
    .insert(locations)
    .values({
      name: `Test Beach ${tag}`,
      city: "Testville",
      country: "Testland",
      latitude: "33.0",
      longitude: "-117.0",
    })
    .returning({ id: locations.id });
  return loc.id;
}

/**
 * Creates an alert with email in deliveryChannels and returns its DB row ID.
 */
async function createEmailAlert(
  userId: string,
  locationId: number,
  channels: string[] = ["email"],
): Promise<number> {
  const [alert] = await db
    .insert(userAlerts)
    .values({
      userId,
      locationId,
      alertType: "daily_report",
      deliveryChannels: channels,
      frequency: "once_daily",
      notificationTime: "08:00",
      timezone: "America/New_York",
    })
    .returning({ id: userAlerts.id });
  return alert.id;
}

// ---------------------------------------------------------------------------
// Per-test state
// ---------------------------------------------------------------------------

let userId: string;
let locationId: number;

beforeEach(async () => {
  // Each test gets a fresh user with an email address by default.
  // Tests that need a null-email user create their own separate user.
  userId = freshUserId();
  locationId = await createLocation();
  await createUser(userId, `${userId}@example.com`);
});

afterEach(async () => {
  // Clean up in FK dependency order: alerts → location → user.
  // We use a broad delete keyed on userId so every alert created in the test
  // is removed even if the test didn't store the alert ID.
  await db.delete(userAlerts).where(eq(userAlerts.userId, userId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(users).where(eq(users.id, userId));
});

// ---------------------------------------------------------------------------
// 1. disableEmailForAlert — idempotency
// ---------------------------------------------------------------------------

describe("disableEmailForAlert — idempotency", () => {
  it("returns 'ok' on the first call and sets emailUnsubscribed", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    const result = await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    expect(result.outcome).toBe("ok");

    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));
    expect(row.emailUnsubscribed).toBe(true);
  });

  it("returns 'ok' on the second call (idempotent) and emailUnsubscribed stays true", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    // First call
    const first = await store.disableEmailForAlert(alertId, `${userId}@example.com`);
    expect(first.outcome).toBe("ok");

    // Second call — should succeed without error
    const second = await store.disableEmailForAlert(alertId, `${userId}@example.com`);
    expect(second.outcome).toBe("ok");

    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed, deliveryChannels: userAlerts.deliveryChannels })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));

    expect(row.emailUnsubscribed).toBe(true);
    // email should not be in channels after either call
    expect(row.deliveryChannels).not.toContain("email");
  });

  it("deactivates the alert when email was the only channel", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    const [row] = await db
      .select({ active: userAlerts.active })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));
    expect(row.active).toBe(false);
  });

  it("does NOT deactivate the alert when other channels remain after email is removed", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email", "push"]);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    const [row] = await db
      .select({ active: userAlerts.active, deliveryChannels: userAlerts.deliveryChannels })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));

    expect(row.active).toBe(true);
    expect(row.deliveryChannels).not.toContain("email");
    expect(row.deliveryChannels).toContain("push");
  });

  it("captures the correct preActionActive value on first call", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    // Alert starts active (default).
    const result = await store.disableEmailForAlert(alertId, `${userId}@example.com`);
    expect(result.outcome).toBe("ok");
    if (result.outcome === "ok") {
      expect(result.preActionActive).toBe(true);
    }
  });

  it("preActionActive is false on the second call (alert was deactivated by the first)", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    // First call deactivates the alert (email was the only channel).
    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // Second call: the alert is already deactivated.
    const second = await store.disableEmailForAlert(alertId, `${userId}@example.com`);
    expect(second.outcome).toBe("ok");
    if (second.outcome === "ok") {
      expect(second.preActionActive).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. updateUserAlert — clears emailUnsubscribed when 'email' is re-added
// ---------------------------------------------------------------------------

describe("updateUserAlert — clears emailUnsubscribed when email is re-added", () => {
  it("clears emailUnsubscribed when deliveryChannels includes 'email'", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    // Simulate an unsubscribe first.
    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // Re-add email via updateUserAlert.
    const updated = await store.updateUserAlert(alertId, userId, {
      deliveryChannels: ["email"],
    });

    expect(updated).toBeDefined();
    expect(updated!.emailUnsubscribed).toBe(false);
    expect(updated!.deliveryChannels).toContain("email");
  });

  it("does NOT clear emailUnsubscribed when deliveryChannels does not include 'email'", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email", "push"]);

    // Simulate an unsubscribe.
    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // Update without adding email back.
    const updated = await store.updateUserAlert(alertId, userId, {
      deliveryChannels: ["push"],
    });

    expect(updated).toBeDefined();
    expect(updated!.emailUnsubscribed).toBe(true);
  });

  it("re-activates the alert when email is re-added after a deactivating unsubscribe", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    // Unsubscribe deactivates the alert (email was only channel).
    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // Re-add email and explicitly set active.
    const updated = await store.updateUserAlert(alertId, userId, {
      deliveryChannels: ["email"],
      active: true,
    });

    expect(updated).toBeDefined();
    expect(updated!.emailUnsubscribed).toBe(false);
    expect(updated!.active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. getUserAlerts — returns emailUnsubscribed in the payload
// ---------------------------------------------------------------------------

describe("getUserAlerts — emailUnsubscribed is included in the response", () => {
  it("returns emailUnsubscribed=false for a freshly created alert", async () => {
    await createEmailAlert(userId, locationId, ["email"]);

    const alerts = await store.getUserAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].emailUnsubscribed).toBe(false);
  });

  it("returns emailUnsubscribed=true after disableEmailForAlert is called", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    const alerts = await store.getUserAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].emailUnsubscribed).toBe(true);
  });

  it("returns emailUnsubscribed=false after email is re-added via updateUserAlert", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);
    await store.updateUserAlert(alertId, userId, { deliveryChannels: ["email"] });

    const alerts = await store.getUserAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].emailUnsubscribed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. disableEmailForAlert — null-email user edge case
// ---------------------------------------------------------------------------

describe("disableEmailForAlert — user with no email address", () => {
  let nullEmailUserId: string;
  let nullEmailAlertId: number;

  beforeEach(async () => {
    nullEmailUserId = freshUserId();
    await createUser(nullEmailUserId, null);
    nullEmailAlertId = await createEmailAlert(nullEmailUserId, locationId, ["email"]);
  });

  afterEach(async () => {
    await db.delete(userAlerts).where(eq(userAlerts.userId, nullEmailUserId));
    await db.delete(users).where(eq(users.id, nullEmailUserId));
  });

  it("returns 'email_mismatch' so the unsubscribe silently fails for no-email accounts", async () => {
    // Any tokenEmail will be compared against null (coerced to '') and must fail.
    const result = await store.disableEmailForAlert(
      nullEmailAlertId,
      "sometoken@example.com",
    );

    expect(result.outcome).toBe("email_mismatch");
  });

  it("does not modify the alert when the user has no email address", async () => {
    await store.disableEmailForAlert(nullEmailAlertId, "sometoken@example.com");

    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed, deliveryChannels: userAlerts.deliveryChannels })
      .from(userAlerts)
      .where(eq(userAlerts.id, nullEmailAlertId));

    // Alert must be unchanged.
    expect(row.emailUnsubscribed).toBe(false);
    expect(row.deliveryChannels).toContain("email");
  });

  it("returns 'email_mismatch' even when tokenEmail is an empty string", async () => {
    // Edge case: tokenEmail === '' should still not match null email.
    const result = await store.disableEmailForAlert(nullEmailAlertId, "");

    expect(result.outcome).toBe("email_mismatch");
  });
});

// ---------------------------------------------------------------------------
// 5. consumeAndReenableEmail — full round-trip
// ---------------------------------------------------------------------------

/**
 * Returns a unique per-invocation token hash so parallel / sequential tests
 * never share a consumed-token key in adminSettings.
 */
function freshTokenHash(): string {
  return `test-token-${Date.now()}-${++counter}`;
}

describe("consumeAndReenableEmail — full unsubscribe → re-enable round-trip", () => {
  // Collect token hashes created during each test so afterEach can purge them.
  let usedHashes: string[] = [];

  afterEach(async () => {
    for (const hash of usedHashes) {
      await db
        .delete(adminSettings)
        .where(eq(adminSettings.key, `undo_token_used:${hash}`));
    }
    usedHashes = [];
  });

  it("restores email channel, clears emailUnsubscribed, and returns 'ok'", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);
    const hash = freshTokenHash();
    usedHashes.push(hash);

    // First disable email via the unsubscribe path.
    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // Now re-enable via the signed-token undo path.
    const result = await store.consumeAndReenableEmail(
      hash,
      alertId,
      `${userId}@example.com`,
      /* restoreActive */ true,
    );

    expect(result).toBe("ok");

    const [row] = await db
      .select({
        emailUnsubscribed: userAlerts.emailUnsubscribed,
        deliveryChannels: userAlerts.deliveryChannels,
        active: userAlerts.active,
      })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));

    expect(row.emailUnsubscribed).toBe(false);
    expect(row.deliveryChannels).toContain("email");
    expect(row.active).toBe(true);
  });

  it("restores the pre-unsubscribe active=false state when restoreActive is false", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);
    const hash = freshTokenHash();
    usedHashes.push(hash);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    const result = await store.consumeAndReenableEmail(
      hash,
      alertId,
      `${userId}@example.com`,
      /* restoreActive */ false,
    );

    expect(result).toBe("ok");

    const [row] = await db
      .select({ active: userAlerts.active })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));

    expect(row.active).toBe(false);
  });

  it("re-adds email to channels even when other channels exist", async () => {
    // Alert was disabled (only email removed, push kept).
    const alertId = await createEmailAlert(userId, locationId, ["push"]);
    const hash = freshTokenHash();
    usedHashes.push(hash);

    // Manually set emailUnsubscribed=true to simulate a prior unsubscribe.
    await db
      .update(userAlerts)
      .set({ emailUnsubscribed: true })
      .where(eq(userAlerts.id, alertId));

    const result = await store.consumeAndReenableEmail(
      hash,
      alertId,
      `${userId}@example.com`,
      /* restoreActive */ true,
    );

    expect(result).toBe("ok");

    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed, deliveryChannels: userAlerts.deliveryChannels })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));

    expect(row.emailUnsubscribed).toBe(false);
    expect(row.deliveryChannels).toContain("email");
    expect(row.deliveryChannels).toContain("push");
  });

  it("returns 'already_used' on a second call with the same token hash", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);
    const hash = freshTokenHash();
    usedHashes.push(hash);

    await store.disableEmailForAlert(alertId, `${userId}@example.com`);

    // First call — consumes the token.
    const first = await store.consumeAndReenableEmail(
      hash,
      alertId,
      `${userId}@example.com`,
      true,
    );
    expect(first).toBe("ok");

    // Second call with same hash — must be rejected as already used.
    const second = await store.consumeAndReenableEmail(
      hash,
      alertId,
      `${userId}@example.com`,
      true,
    );
    expect(second).toBe("already_used");
  });

  it("returns 'not_found' for a nonexistent alertId", async () => {
    const hash = freshTokenHash();
    usedHashes.push(hash);

    const result = await store.consumeAndReenableEmail(
      hash,
      999_999_999,
      `${userId}@example.com`,
      true,
    );

    expect(result).toBe("not_found");
  });

  it("returns 'email_mismatch' when tokenEmail does not match the alert owner's email", async () => {
    const alertId = await createEmailAlert(userId, locationId, ["email"]);
    const hash = freshTokenHash();
    usedHashes.push(hash);

    const result = await store.consumeAndReenableEmail(
      hash,
      alertId,
      "wrong@example.com",
      true,
    );

    expect(result).toBe("email_mismatch");

    // Alert must be unmodified.
    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed })
      .from(userAlerts)
      .where(eq(userAlerts.id, alertId));
    expect(row.emailUnsubscribed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. consumeAndReenableEmail — null-email user edge case
// ---------------------------------------------------------------------------

describe("consumeAndReenableEmail — user with no email address", () => {
  let nullEmailUserId2: string;
  let nullEmailAlertId2: number;
  let usedHashes: string[] = [];

  beforeEach(async () => {
    nullEmailUserId2 = freshUserId();
    await createUser(nullEmailUserId2, null);
    nullEmailAlertId2 = await createEmailAlert(nullEmailUserId2, locationId, ["email"]);
  });

  afterEach(async () => {
    await db.delete(userAlerts).where(eq(userAlerts.userId, nullEmailUserId2));
    await db.delete(users).where(eq(users.id, nullEmailUserId2));
    for (const hash of usedHashes) {
      await db
        .delete(adminSettings)
        .where(eq(adminSettings.key, `undo_token_used:${hash}`));
    }
    usedHashes = [];
  });

  it("returns 'email_mismatch' when the user has no email address", async () => {
    const hash = freshTokenHash();
    usedHashes.push(hash);

    const result = await store.consumeAndReenableEmail(
      hash,
      nullEmailAlertId2,
      "sometoken@example.com",
      true,
    );

    expect(result).toBe("email_mismatch");
  });

  it("does not modify the alert when the user has no email address", async () => {
    const hash = freshTokenHash();
    usedHashes.push(hash);

    await store.consumeAndReenableEmail(
      hash,
      nullEmailAlertId2,
      "sometoken@example.com",
      true,
    );

    const [row] = await db
      .select({ emailUnsubscribed: userAlerts.emailUnsubscribed, deliveryChannels: userAlerts.deliveryChannels })
      .from(userAlerts)
      .where(eq(userAlerts.id, nullEmailAlertId2));

    expect(row.emailUnsubscribed).toBe(false);
    expect(row.deliveryChannels).toContain("email");
  });

  it("returns 'email_mismatch' even when tokenEmail is an empty string", async () => {
    const hash = freshTokenHash();
    usedHashes.push(hash);

    const result = await store.consumeAndReenableEmail(
      hash,
      nullEmailAlertId2,
      "",
      true,
    );

    expect(result).toBe("email_mismatch");
  });
});
