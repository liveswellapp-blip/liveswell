/**
 * sms-verification.test.ts
 *
 * Confirms the full SMS verification flow end-to-end:
 *   1. Correct code → phone marked verified, token consumed
 *   2. Wrong code  → verification rejected, token NOT consumed
 *   3. Expired code → verification rejected (TTL enforced in DB query)
 *   4. Verified state persists via isPhoneVerified() after successful verify
 *   5. No token present → verification rejected
 *   6. Token is deleted after first use (replay attack not possible)
 *
 * Tests hit the real Neon/PostgreSQL database so the actual drizzle queries
 * and SQL constraints are exercised.  Each test uses unique (userId, phone)
 * pairs and cleans up its rows in afterEach so no residue is left behind.
 *
 * Run with:  npm test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SMSService } from "./sms-service";
import { db } from "./db";
import {
  users,
  phoneVerificationTokens,
  verifiedPhones,
} from "../shared/schema";
import { and, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let testCounter = 0;

/** Generates a unique (userId, phone) pair per test invocation. */
function freshPair() {
  const n = ++testCounter;
  return {
    userId: `test-sms-verify-${Date.now()}-${n}`,
    phone: `+1555001${String(n).padStart(4, "0")}`,
  };
}

/** Directly insert a verification token into the DB, bypassing Twilio. */
async function seedToken(
  userId: string,
  phone: string,
  code: string,
  expiresAt: Date,
): Promise<void> {
  // Remove any existing token first (mirrors sendVerificationCode behaviour)
  await db
    .delete(phoneVerificationTokens)
    .where(
      and(
        eq(phoneVerificationTokens.userId, userId),
        eq(phoneVerificationTokens.phone, phone),
      ),
    );
  await db
    .insert(phoneVerificationTokens)
    .values({ userId, phone, code, expiresAt });
}

/** Returns all remaining token rows for (userId, phone). */
async function getTokenRows(userId: string, phone: string) {
  return db
    .select()
    .from(phoneVerificationTokens)
    .where(
      and(
        eq(phoneVerificationTokens.userId, userId),
        eq(phoneVerificationTokens.phone, phone),
      ),
    );
}

/** Returns all verified-phone rows for (userId, phone). */
async function getVerifiedRows(userId: string, phone: string) {
  return db
    .select()
    .from(verifiedPhones)
    .where(
      and(
        eq(verifiedPhones.userId, userId),
        eq(verifiedPhones.phone, phone),
      ),
    );
}

// ---------------------------------------------------------------------------
// Per-test fixtures
// ---------------------------------------------------------------------------

let currentUserId: string;
let currentPhone: string;

beforeEach(async () => {
  const pair = freshPair();
  currentUserId = pair.userId;
  currentPhone = pair.phone;

  // Insert a minimal users row so FK constraints are satisfied.
  await db.insert(users).values({ id: currentUserId });
});

afterEach(async () => {
  // Remove child rows before the user row to satisfy FK ordering.
  await db
    .delete(phoneVerificationTokens)
    .where(eq(phoneVerificationTokens.userId, currentUserId));
  await db
    .delete(verifiedPhones)
    .where(eq(verifiedPhones.userId, currentUserId));
  await db.delete(users).where(eq(users.id, currentUserId));
});

// ---------------------------------------------------------------------------
// Tests — correct code path
// ---------------------------------------------------------------------------

describe("SMSService.verifyCode() — correct code", () => {
  it("returns true when the code matches and the token is not yet expired", async () => {
    const code = "123456";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    const result = await SMSService.verifyCode(currentUserId, currentPhone, code);

    expect(result).toBe(true);
  });

  it("inserts a row into verified_phones after a successful verification", async () => {
    const code = "654321";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, code);

    const rows = await getVerifiedRows(currentUserId, currentPhone);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(currentUserId);
    expect(rows[0].phone).toBe(currentPhone);
  });

  it("deletes the consumed token after a successful verification", async () => {
    const code = "789012";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, code);

    const remaining = await getTokenRows(currentUserId, currentPhone);
    expect(remaining).toHaveLength(0);
  });

  it("trims whitespace from the submitted code before comparing", async () => {
    const code = "345678";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    // Simulate a user accidentally adding spaces around the code.
    const result = await SMSService.verifyCode(currentUserId, currentPhone, `  ${code}  `);

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — wrong code path
// ---------------------------------------------------------------------------

describe("SMSService.verifyCode() — wrong code", () => {
  it("returns false when the submitted code does not match", async () => {
    const code = "111111";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    const result = await SMSService.verifyCode(currentUserId, currentPhone, "999999");

    expect(result).toBe(false);
  });

  it("does NOT insert a verified_phones row when the code is wrong", async () => {
    const code = "222222";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, "000000");

    const rows = await getVerifiedRows(currentUserId, currentPhone);
    expect(rows).toHaveLength(0);
  });

  it("leaves the token intact so the user can retry", async () => {
    const code = "333333";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, "111111");

    const remaining = await getTokenRows(currentUserId, currentPhone);
    expect(remaining).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — expired token path
// ---------------------------------------------------------------------------

describe("SMSService.verifyCode() — expired token", () => {
  it("returns false when the token has already expired", async () => {
    const code = "444444";
    const expiresAt = new Date(Date.now() - 1); // expired 1 ms ago
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    const result = await SMSService.verifyCode(currentUserId, currentPhone, code);

    expect(result).toBe(false);
  });

  it("does NOT mark the phone as verified when the token has expired", async () => {
    const code = "555555";
    const expiresAt = new Date(Date.now() - 10 * 60 * 1000); // expired 10 min ago
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, code);

    const rows = await getVerifiedRows(currentUserId, currentPhone);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — no token present
// ---------------------------------------------------------------------------

describe("SMSService.verifyCode() — no token", () => {
  it("returns false when no token exists for the user/phone", async () => {
    const result = await SMSService.verifyCode(currentUserId, currentPhone, "123456");

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — isPhoneVerified() reflects persisted state
// ---------------------------------------------------------------------------

describe("SMSService.isPhoneVerified() — persistence", () => {
  it("returns false before any verification has taken place", async () => {
    const verified = await SMSService.isPhoneVerified(currentUserId, currentPhone);
    expect(verified).toBe(false);
  });

  it("returns true immediately after a successful verifyCode() call", async () => {
    const code = "666666";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, code);

    const verified = await SMSService.isPhoneVerified(currentUserId, currentPhone);
    expect(verified).toBe(true);
  });

  it("returns false after a failed verifyCode() (wrong code)", async () => {
    const code = "777777";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, "000000");

    const verified = await SMSService.isPhoneVerified(currentUserId, currentPhone);
    expect(verified).toBe(false);
  });

  it("verified state survives a second isPhoneVerified() call (durable in DB)", async () => {
    const code = "888888";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    await SMSService.verifyCode(currentUserId, currentPhone, code);

    // Simulate page refresh / separate request — call isPhoneVerified again
    const firstCheck = await SMSService.isPhoneVerified(currentUserId, currentPhone);
    const secondCheck = await SMSService.isPhoneVerified(currentUserId, currentPhone);

    expect(firstCheck).toBe(true);
    expect(secondCheck).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — replay attack prevention
// ---------------------------------------------------------------------------

describe("SMSService.verifyCode() — replay prevention", () => {
  it("returns false on a second attempt with the same code after a successful verification", async () => {
    const code = "999999";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await seedToken(currentUserId, currentPhone, code, expiresAt);

    const firstAttempt = await SMSService.verifyCode(currentUserId, currentPhone, code);
    expect(firstAttempt).toBe(true);

    // Re-using the same code must not succeed once the token is consumed.
    const secondAttempt = await SMSService.verifyCode(currentUserId, currentPhone, code);
    expect(secondAttempt).toBe(false);
  });
});
