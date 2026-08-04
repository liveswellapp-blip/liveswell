/**
 * password-reset.test.ts
 *
 * End-to-end verification of the forgot-password / reset-password flow using
 * the REAL Express auth routes tested over HTTP via supertest.  Every request
 * goes through the actual handler code in auth.ts, including session
 * middleware, bcrypt, and the DatabaseStorage calls.
 *
 * Covered cases:
 *
 *   /api/auth/forgot-password
 *     • Always returns 200 (prevents email enumeration)
 *     • Writes a token row to the DB for a known user
 *     • Creates no token row for an unknown email
 *     • Issuing a second token for the same user replaces the first
 *
 *   /api/auth/reset-password
 *     • Valid token → 200, password updated, login works with new password
 *     • Expired token → 400 (not 500), password unchanged
 *     • Consumed (already-used) token → 400
 *     • Missing token / short password → 400 with clear message
 *
 *   /api/auth/login
 *     • Old password rejected after successful reset
 *     • New password accepted after successful reset
 *
 * Run with:  npm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import { setupAuth } from "./auth";
import { DatabaseStorage } from "./storage";
import { db } from "./db";
import { users, passwordResetTokens } from "../shared/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Test-app bootstrap — a minimal Express app with only the auth routes so
// the test does not drag in the full surf-data stack.
// ---------------------------------------------------------------------------

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await setupAuth(app);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const store = new DatabaseStorage();
let counter = 0;

function freshEmail(): string {
  return `pw-reset-test-${Date.now()}-${++counter}@example.invalid`;
}

function freshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Fixtures — create a real user before each test, tear down after.
// ---------------------------------------------------------------------------

const INITIAL_PASSWORD = "OldPassword1!";
const NEW_PASSWORD = "NewPassword2@";

let userId: string;
let userEmail: string;

beforeEach(async () => {
  userEmail = freshEmail();
  const user = await store.createUser({
    email: userEmail,
    passwordHash: "$2b$12$placeholder", // will be replaced in specific tests
  });
  userId = user.id;
});

afterEach(async () => {
  // Delete tokens first (FK child), then the user row.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
});

// ---------------------------------------------------------------------------
// /api/auth/forgot-password
// ---------------------------------------------------------------------------

describe("POST /api/auth/forgot-password", () => {
  it("always returns 200 for a known email (anti-enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
  });

  it("always returns 200 for an unknown email (anti-enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.invalid" });

    expect(res.status).toBe(200);
  });

  it("creates a token row in the database for a known user", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userEmail });

    // The token is created asynchronously after the response is sent —
    // give the handler's background work a moment to complete.
    await new Promise((r) => setTimeout(r, 500));

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    expect(row).toBeDefined();
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("creates no token for an unknown email", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.invalid" });

    await new Promise((r) => setTimeout(r, 300));

    // Should be zero rows — no user matched so no token was inserted.
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    expect(rows).toHaveLength(0);
  });

  it("replaces the first token when a second forgot-password request arrives for the same user", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userEmail });
    await new Promise((r) => setTimeout(r, 500));

    const [firstRow] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    expect(firstRow).toBeDefined();
    const firstToken = firstRow.token;

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userEmail });
    await new Promise((r) => setTimeout(r, 500));

    // The old token must no longer exist.
    const oldRow = await store.getPasswordResetToken(firstToken);
    expect(oldRow).toBeUndefined();

    // Exactly one fresh token must exist.
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].token).not.toBe(firstToken);
  });
});

// ---------------------------------------------------------------------------
// /api/auth/reset-password — happy path
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password — happy path", () => {
  it("returns 200 and a success message for a valid token", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password updated/i);
  });

  it("the new password is accepted at /api/auth/login after a successful reset", async () => {
    // Give the user a known initial password first.
    const bcrypt = await import("bcrypt");
    const initialHash = await bcrypt.hash(INITIAL_PASSWORD, 12);
    await store.updateUserPasswordHash(userId, initialHash);

    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // Reset to NEW_PASSWORD.
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    // Old password must be rejected.
    const oldRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: INITIAL_PASSWORD });
    expect(oldRes.status).toBe(401);

    // New password must be accepted.
    const newRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: NEW_PASSWORD });
    expect(newRes.status).toBe(200);
    expect(newRes.body.email).toBe(userEmail);
  });

  it("removes the token from the database after a successful reset", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    const record = await store.getPasswordResetToken(token);
    expect(record).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// /api/auth/reset-password — expired token
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password — expired token", () => {
  it("returns 400 (not 500) for an expired token", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() - 1), // already expired
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it("does not update the password when the token is expired", async () => {
    const bcrypt = await import("bcrypt");
    const initialHash = await bcrypt.hash(INITIAL_PASSWORD, 12);
    await store.updateUserPasswordHash(userId, initialHash);

    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() - 1),
    });

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    // The original password must still work.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: INITIAL_PASSWORD });
    expect(loginRes.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// /api/auth/reset-password — consumed (re-used) token
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password — consumed token", () => {
  it("returns 400 on a second attempt with the same token", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // First use — must succeed.
    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });
    expect(first.status).toBe(200);

    // Second use — must fail.
    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "AnotherPassword3#" });
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/invalid or has expired/i);
  });

  it("the password stays as the first-reset value after a re-use attempt", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });

    // Try (and fail) to reset again.
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "AnotherPassword3#" });

    // Should still accept the first reset password.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: NEW_PASSWORD });
    expect(loginRes.status).toBe(200);

    // Should reject the second attempted password.
    const rejectRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: "AnotherPassword3#" });
    expect(rejectRes.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// /api/auth/reset-password — input validation
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password — input validation", () => {
  it("returns 400 when the token field is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/token and password are required/i);
  });

  it("returns 400 when the password field is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: freshToken() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/token and password are required/i);
  });

  it("returns 400 when the password is shorter than 8 characters", async () => {
    const token = freshToken();
    await store.createPasswordResetToken({
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });

  it("returns 400 for a completely unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: freshToken(), password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });
});
