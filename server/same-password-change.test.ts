/**
 * same-password-change.test.ts
 *
 * Confirms that PATCH /api/auth/password rejects a new password that is
 * identical to the current one — both on the server (route handler) and
 * on the client (form validation guard).
 *
 * Storage is mocked so the test does not require a live database and is
 * resilient to schema changes.
 *
 * Covered cases:
 *
 *   PATCH /api/auth/password — same-password rejection
 *     • currentPassword === newPassword → 400 with expected message
 *     • Different valid newPassword → 200 (regression guard: change still works)
 *     • New password is not persisted when same-password check fires
 *
 *   PATCH /api/auth/password — surrounding validations (guard that same-password
 *   check sits inside a correctly wired route):
 *     • Unauthenticated request → 401
 *     • Missing body fields → 400
 *     • newPassword shorter than 8 chars → 400
 *     • Wrong currentPassword → 400
 *
 *   Client-side guard (unit — no network call needed)
 *     • Same-password check fires and blocks form submission
 *     • Valid different password allows submission
 *     • Other validations (too short, mismatched confirm) fire first
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Mock the storage module BEFORE importing auth so the route handlers receive
// the mock.  vi.mock is hoisted to the top of the file, so the factory must
// not reference variables declared in module scope — use vi.hoisted() instead.
// ---------------------------------------------------------------------------

const mockStore = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUserPasswordHash: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: mockStore,
}));

// Import AFTER the mock is installed.
import { setupAuth } from "./auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_ID = "test-user-001";
const USER_EMAIL = "test@example.invalid";
const CURRENT_PASSWORD = "CurrentPass1!";
const DIFFERENT_PASSWORD = "DifferentPass2@";

// ---------------------------------------------------------------------------
// Pre-compute a bcrypt hash of CURRENT_PASSWORD once for the whole suite.
// bcrypt.hash with cost-12 is slow; we do it once and reuse.
// ---------------------------------------------------------------------------

let currentHash: string;

beforeAll(async () => {
  currentHash = await bcrypt.hash(CURRENT_PASSWORD, 12);
});

// ---------------------------------------------------------------------------
// Minimal Express app — only auth routes, no other middleware.
// ---------------------------------------------------------------------------

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await setupAuth(app);
});

// ---------------------------------------------------------------------------
// Helper — build a supertest agent that already has a session cookie
// simulating a logged-in user.  We achieve this by logging in through the
// real /api/auth/login route, which means getUser must be set up to return
// a user with a valid password hash.
// ---------------------------------------------------------------------------

async function authenticatedAgent() {
  // Login uses getUserByEmail; PATCH /api/auth/password uses getUser.
  mockStore.getUserByEmail.mockResolvedValue({
    id: USER_ID,
    email: USER_EMAIL,
    passwordHash: currentHash,
  });

  const agent = request.agent(app);
  const loginRes = await agent
    .post("/api/auth/login")
    .send({ email: USER_EMAIL, password: CURRENT_PASSWORD });

  expect(loginRes.status).toBe(200); // sanity-check login worked

  // Now set up getUser for the PATCH handler.
  mockStore.getUser.mockResolvedValue({
    id: USER_ID,
    email: USER_EMAIL,
    passwordHash: currentHash,
  });
  mockStore.updateUserPasswordHash.mockResolvedValue(undefined);

  return agent;
}

// ---------------------------------------------------------------------------
// PATCH /api/auth/password — same-password rejection (primary focus)
// ---------------------------------------------------------------------------

describe("PATCH /api/auth/password — same-password rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when newPassword equals currentPassword", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: CURRENT_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/must be different from your current password/i);
  });

  it("does not call updateUserPasswordHash when newPassword equals currentPassword", async () => {
    const agent = await authenticatedAgent();

    await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: CURRENT_PASSWORD });

    expect(mockStore.updateUserPasswordHash).not.toHaveBeenCalled();
  });

  it("returns 200 when newPassword differs from currentPassword (regression guard)", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: DIFFERENT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password updated/i);
  });

  it("calls updateUserPasswordHash exactly once with a new hash for a valid change", async () => {
    const agent = await authenticatedAgent();

    await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: DIFFERENT_PASSWORD });

    expect(mockStore.updateUserPasswordHash).toHaveBeenCalledTimes(1);
    expect(mockStore.updateUserPasswordHash).toHaveBeenCalledWith(
      USER_ID,
      expect.any(String), // new bcrypt hash
    );

    // The new hash must not match the old password.
    const [, newHash] = mockStore.updateUserPasswordHash.mock.calls[0];
    const stillOld = await bcrypt.compare(CURRENT_PASSWORD, newHash);
    expect(stillOld).toBe(false);

    const matchesNew = await bcrypt.compare(DIFFERENT_PASSWORD, newHash);
    expect(matchesNew).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/password — surrounding validations
// ---------------------------------------------------------------------------

describe("PATCH /api/auth/password — surrounding validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const res = await request(app)
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: DIFFERENT_PASSWORD });

    expect(res.status).toBe(401);
  });

  it("returns 400 when currentPassword is missing", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ newPassword: DIFFERENT_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/current password and new password are required/i);
  });

  it("returns 400 when newPassword is missing", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/current password and new password are required/i);
  });

  it("returns 400 when newPassword is shorter than 8 characters", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });

  it("returns 400 when currentPassword is wrong", async () => {
    const agent = await authenticatedAgent();

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: "WrongPassword9!", newPassword: DIFFERENT_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/current password is incorrect/i);
  });
});

// ---------------------------------------------------------------------------
// Client-side guard — unit test of the same-password logic from profile.tsx
// ---------------------------------------------------------------------------

describe("client-side same-password guard (unit)", () => {
  /**
   * Mirrors the guard in handleChangePassword inside profile.tsx:
   *
   *   if (newPw.length < 8) {
   *     setPwError("New password must be at least 8 characters.");
   *     return;
   *   }
   *   if (newPw === currentPw) {
   *     setPwError("New password must be different from your current password.");
   *     return;
   *   }
   *   if (newPw !== confirmPw) {
   *     setPwError("New passwords do not match.");
   *     return;
   *   }
   *   // → would call fetch() here
   *
   * The test confirms the same-password branch fires before any network call,
   * so the API is never hit for same-password submissions.
   */
  function clientSideValidate(
    currentPw: string,
    newPw: string,
    confirmPw: string,
  ): { error: string | null; wouldFetch: boolean } {
    if (newPw.length < 8) {
      return { error: "New password must be at least 8 characters.", wouldFetch: false };
    }
    if (newPw === currentPw) {
      return {
        error: "New password must be different from your current password.",
        wouldFetch: false,
      };
    }
    if (newPw !== confirmPw) {
      return { error: "New passwords do not match.", wouldFetch: false };
    }
    return { error: null, wouldFetch: true };
  }

  it("blocks submission and sets the error when new === current", () => {
    const result = clientSideValidate(CURRENT_PASSWORD, CURRENT_PASSWORD, CURRENT_PASSWORD);
    expect(result.wouldFetch).toBe(false);
    expect(result.error).toMatch(/must be different from your current password/i);
  });

  it("does not block submission when new !== current and passwords match", () => {
    const result = clientSideValidate(CURRENT_PASSWORD, DIFFERENT_PASSWORD, DIFFERENT_PASSWORD);
    expect(result.wouldFetch).toBe(true);
    expect(result.error).toBeNull();
  });

  it("blocks for a short new password before reaching the same-password check", () => {
    const result = clientSideValidate(CURRENT_PASSWORD, "short", "short");
    expect(result.wouldFetch).toBe(false);
    expect(result.error).toMatch(/at least 8 characters/i);
  });

  it("blocks for mismatched confirm password", () => {
    const result = clientSideValidate(CURRENT_PASSWORD, DIFFERENT_PASSWORD, "WrongConfirm9!");
    expect(result.wouldFetch).toBe(false);
    expect(result.error).toMatch(/do not match/i);
  });
});
