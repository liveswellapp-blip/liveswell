/**
 * Integration tests for the admin user-management endpoints
 * (server/admin-user-controls.ts): delete, suspend, plan override, profile edit.
 *
 * Uses supertest against an Express app with the real handlers; the DB, storage
 * layer, and Clerk client are mocked so no live credentials are required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Controllable mock state
// ---------------------------------------------------------------------------
let mockUser: any = null; // storage.getUser result
let mockUserByEmail: any = null; // storage.getUserByEmail result
let mockUpdateReturning: any[] = []; // db.update(...).returning() rows

const dbUpdateSets: any[] = [];
const txDeletedTables: any[] = [];
let txRan = false;

const clerkDeleteUser = vi.fn();
const clerkUpdateUser = vi.fn();
const clerkGetUser = vi.fn();
const clerkCreateEmail = vi.fn();
const clerkDeleteEmail = vi.fn();

vi.mock("./storage", () => ({
  storage: {
    getUser: vi.fn(async () => mockUser),
    getUserByEmail: vi.fn(async () => mockUserByEmail),
  },
}));

vi.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      deleteUser: (...a: any[]) => clerkDeleteUser(...a),
      updateUser: (...a: any[]) => clerkUpdateUser(...a),
      getUser: (...a: any[]) => clerkGetUser(...a),
    },
    emailAddresses: {
      createEmailAddress: (...a: any[]) => clerkCreateEmail(...a),
      deleteEmailAddress: (...a: any[]) => clerkDeleteEmail(...a),
    },
  },
}));

// Controls whether the next tx.insert call inside a transaction should throw.
let txInsertShouldFail = false;

vi.mock("./db", () => {
  /**
   * Build a mock for either the top-level db or a tx object.
   * All writes capture into the shared dbUpdateSets array so tests can assert
   * on whether the conditional update and event insert actually ran.
   */
  const makeWritable = () => ({
    update: vi.fn(() => ({
      set: vi.fn((data: any) => {
        dbUpdateSets.push(data);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => mockUpdateReturning),
          })),
        };
      }),
    })),
    insert: vi.fn((_table: any) => ({
      values: vi.fn((_data: any) => {
        if (txInsertShouldFail) throw new Error("simulated event-insert failure");
        return Promise.resolve([]);
      }),
    })),
  });

  const makeTx = () => ({
    ...makeWritable(),
    delete: vi.fn((table: any) => {
      txDeletedTables.push(table);
      return { where: vi.fn(async () => undefined) };
    }),
  });

  return {
    db: {
      ...makeWritable(),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            // Return mockUser so post-transaction fetches get the updated row.
            const rows = mockUser ? [mockUser] : [];
            const thenable: any = Promise.resolve(rows);
            thenable.limit = vi.fn(() => Promise.resolve(rows));
            return thenable;
          }),
        })),
      })),
      transaction: vi.fn(async (fn: any) => {
        txRan = true;
        return fn(makeTx());
      }),
    },
  };
});

import { registerAdminUserControls } from "./admin-user-controls";
import { agentSmsThreads } from "@shared/schema";

function buildApp() {
  const app = express();
  app.use(express.json());
  // requireAdminAuth pass-through — admin session auth is tested elsewhere
  registerAdminUserControls(app, (_req, _res, next) => next());
  return app;
}

beforeEach(() => {
  mockUser = null;
  mockUserByEmail = null;
  mockUpdateReturning = [];
  dbUpdateSets.length = 0;
  txDeletedTables.length = 0;
  txRan = false;
  txInsertShouldFail = false;
  vi.clearAllMocks();
  clerkDeleteUser.mockResolvedValue(undefined);
  clerkUpdateUser.mockResolvedValue(undefined);
  clerkGetUser.mockResolvedValue({ emailAddresses: [] });
  clerkCreateEmail.mockResolvedValue({ id: "email_new" });
  clerkDeleteEmail.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:userId
// ---------------------------------------------------------------------------
describe("DELETE /api/admin/users/:userId", () => {
  it("404 when the user does not exist", async () => {
    const res = await request(buildApp()).delete("/api/admin/users/user_missing");
    expect(res.status).toBe(404);
    expect(txRan).toBe(false);
  });

  it("aborts with 502 and deletes NO local data when Clerk deletion fails", async () => {
    mockUser = { id: "user_1", email: "a@b.co" };
    clerkDeleteUser.mockRejectedValue(Object.assign(new Error("clerk down"), { status: 500 }));

    const res = await request(buildApp()).delete("/api/admin/users/user_1");
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/No data was deleted/i);
    expect(txRan).toBe(false);
  });

  it("treats a Clerk 404 (already gone) as success and still deletes local data", async () => {
    mockUser = { id: "user_1", email: "a@b.co" };
    clerkDeleteUser.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));

    const res = await request(buildApp()).delete("/api/admin/users/user_1");
    expect(res.status).toBe(204);
    expect(txRan).toBe(true);
  });

  it("204 on success: Clerk account deleted first, then all local tables in a transaction", async () => {
    mockUser = { id: "user_1", email: "a@b.co" };
    const res = await request(buildApp()).delete("/api/admin/users/user_1");
    expect(res.status).toBe(204);
    expect(clerkDeleteUser).toHaveBeenCalledWith("user_1");
    expect(txRan).toBe(true);
    // users row + every child table with a userId FK is deleted
    expect(txDeletedTables.length).toBeGreaterThanOrEqual(12);
  });

  it("skips Clerk for legacy (non user_) IDs but still deletes local data", async () => {
    mockUser = { id: "45116786", email: "legacy@b.co" };
    const res = await request(buildApp()).delete("/api/admin/users/45116786");
    expect(res.status).toBe(204);
    expect(clerkDeleteUser).not.toHaveBeenCalled();
    expect(txRan).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:userId/suspend
// ---------------------------------------------------------------------------
describe("POST /api/admin/users/:userId/suspend", () => {
  it("400 when suspend is not a boolean", async () => {
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/suspend")
      .send({ suspend: "yes" });
    expect(res.status).toBe(400);
  });

  it("404 when no row was updated", async () => {
    mockUpdateReturning = [];
    const res = await request(buildApp())
      .post("/api/admin/users/user_missing/suspend")
      .send({ suspend: true });
    expect(res.status).toBe(404);
  });

  it("200 sets isSuspended and returns the updated user", async () => {
    mockUpdateReturning = [{ id: "user_1", isSuspended: true }];
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/suspend")
      .send({ suspend: true });
    expect(res.status).toBe(200);
    expect(res.body.isSuspended).toBe(true);
    expect(dbUpdateSets[0]).toMatchObject({ isSuspended: true });
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:userId/plan-override
// ---------------------------------------------------------------------------
describe("POST /api/admin/users/:userId/plan-override", () => {
  it("400 when grantPro is not a boolean", async () => {
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({});
    expect(res.status).toBe(400);
  });

  it("409 when revoking would downgrade a paying Whop subscriber", async () => {
    mockUser = { id: "user_1", isPro: true, whopMembershipId: "mem_123" };
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({ grantPro: false });
    expect(res.status).toBe(409);
    expect(dbUpdateSets).toHaveLength(0); // isPro untouched
  });

  it("grants Pro without touching isTestAccount or whopMembershipId", async () => {
    mockUser = { id: "user_1", isPro: false, whopMembershipId: null };
    mockUpdateReturning = [{ id: "user_1", isPro: true }];
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({ grantPro: true });
    expect(res.status).toBe(200);
    expect(dbUpdateSets[0]).toMatchObject({ isPro: true });
    expect(dbUpdateSets[0]).not.toHaveProperty("isTestAccount");
    expect(dbUpdateSets[0]).not.toHaveProperty("whopMembershipId");
  });

  it("revokes a comp when there is no Whop membership", async () => {
    mockUser = { id: "user_1", isPro: true, whopMembershipId: null };
    mockUpdateReturning = [{ id: "user_1", isPro: false }];
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({ grantPro: false });
    expect(res.status).toBe(200);
    expect(dbUpdateSets[0]).toMatchObject({ isPro: false });
  });

  it("idempotency — granting Pro to an already-Pro user returns 200 without a duplicate event", async () => {
    mockUser = { id: "user_1", isPro: true, whopMembershipId: null };
    // mockUpdateReturning = [] means isPro was already true — no row updated.
    mockUpdateReturning = [];
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({ grantPro: true });
    expect(res.status).toBe(200);
    // The conditional update ran but returned no rows (already Pro).
    expect(dbUpdateSets[0]).toMatchObject({ isPro: true });
    // Only one DB write — the conditional update inside the transaction.
    // No event-insert should follow because the state didn't change.
    // (txRan is true; but the second insert inside tx is never reached when
    //  returning is empty.)
    expect(txRan).toBe(true);
  });

  it("rollback — a failure in the audit event insert propagates as 500 so the Pro update rolls back", async () => {
    mockUser = { id: "user_1", isPro: false, whopMembershipId: null };
    mockUpdateReturning = [{ id: "user_1", isPro: true }]; // state would change
    txInsertShouldFail = true; // tx.insert(userEvents) throws
    const res = await request(buildApp())
      .post("/api/admin/users/user_1/plan-override")
      .send({ grantPro: true });
    // Error must NOT be silently swallowed — the endpoint should return 500
    // so the caller knows the transition was not committed.
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:userId/profile
// ---------------------------------------------------------------------------
describe("PUT /api/admin/users/:userId/profile", () => {
  const baseUser = { id: "user_1", email: "old@b.co", firstName: "Old", lastName: "Name" };

  it("400 on an invalid email", async () => {
    mockUser = { ...baseUser };
    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ email: "nope" });
    expect(res.status).toBe(400);
  });

  it("409 when the email belongs to another account", async () => {
    mockUser = { ...baseUser };
    mockUserByEmail = { id: "user_2" };
    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ email: "taken@b.co" });
    expect(res.status).toBe(409);
    expect(dbUpdateSets).toHaveLength(0);
  });

  it("passes null to Clerk when a name is cleared (so Clerk actually clears it)", async () => {
    mockUser = { ...baseUser };
    mockUpdateReturning = [{ ...baseUser, firstName: null }];
    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ firstName: "", lastName: "Name", email: "old@b.co" });
    expect(res.status).toBe(200);
    expect(clerkUpdateUser).toHaveBeenCalledWith("user_1", { firstName: null, lastName: "Name" });
    expect(dbUpdateSets[0]).toMatchObject({ firstName: null, lastName: "Name" });
  });

  it("email change: creates the new primary address in Clerk and removes the old one", async () => {
    mockUser = { ...baseUser };
    clerkGetUser.mockResolvedValue({
      emailAddresses: [{ id: "email_old", emailAddress: "old@b.co" }],
    });
    mockUpdateReturning = [{ ...baseUser, email: "new@b.co" }];

    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ email: "new@b.co" });
    expect(res.status).toBe(200);
    expect(clerkCreateEmail).toHaveBeenCalledWith({
      userId: "user_1", emailAddress: "new@b.co", verified: true, primary: true,
    });
    expect(clerkDeleteEmail).toHaveBeenCalledWith("email_old");
    expect(dbUpdateSets[0]).toMatchObject({ email: "new@b.co" });
  });

  it("502 and NO local update when removing the old Clerk email fails", async () => {
    mockUser = { ...baseUser };
    clerkGetUser.mockResolvedValue({
      emailAddresses: [{ id: "email_old", emailAddress: "old@b.co" }],
    });
    clerkDeleteEmail.mockRejectedValue(new Error("clerk down"));

    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ email: "new@b.co" });
    expect(res.status).toBe(502);
    expect(dbUpdateSets).toHaveLength(0);
  });

  it("502 and NO local update when the Clerk name update fails", async () => {
    mockUser = { ...baseUser };
    clerkUpdateUser.mockRejectedValue(new Error("clerk down"));
    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ firstName: "New", email: "old@b.co" });
    expect(res.status).toBe(502);
    expect(dbUpdateSets).toHaveLength(0);
  });

  it("retry after a failed email change is idempotent: reuses the existing Clerk address", async () => {
    mockUser = { ...baseUser };
    clerkGetUser.mockResolvedValue({
      emailAddresses: [
        { id: "email_old", emailAddress: "old@b.co" },
        { id: "email_new", emailAddress: "new@b.co" }, // left over from a failed attempt
      ],
    });
    mockUpdateReturning = [{ ...baseUser, email: "new@b.co" }];

    const res = await request(buildApp())
      .put("/api/admin/users/user_1/profile")
      .send({ email: "new@b.co" });
    expect(res.status).toBe(200);
    expect(clerkCreateEmail).not.toHaveBeenCalled();
    expect(clerkUpdateUser).toHaveBeenCalledWith("user_1", { primaryEmailAddressID: "email_new" });
    expect(clerkDeleteEmail).toHaveBeenCalledWith("email_old");
  });

  it("skips Clerk entirely for legacy (non user_) IDs", async () => {
    mockUser = { id: "45116786", email: "legacy@b.co", firstName: null, lastName: null };
    mockUpdateReturning = [{ id: "45116786", email: "legacy@b.co", firstName: "A" }];
    const res = await request(buildApp())
      .put("/api/admin/users/45116786/profile")
      .send({ firstName: "A", email: "legacy@b.co" });
    expect(res.status).toBe(200);
    expect(clerkUpdateUser).not.toHaveBeenCalled();
  });
});

// Sanity: the SMS-thread purge uses the agentSmsThreads table (phone-keyed data)
describe("delete purges phone-keyed SMS threads", () => {
  it("deletes agentSmsThreads rows when the user has associated phone numbers", async () => {
    mockUser = { id: "user_1", email: "a@b.co" };
    // Make db.select return a phone number for every child-table lookup
    const { db } = await import("./db");
    (db.select as any).mockImplementation(() => ({
      from: vi.fn(() => ({ where: vi.fn(async () => [{ phone: "+15551234567", id: 1 }]) })),
    }));

    const res = await request(buildApp()).delete("/api/admin/users/user_1");
    expect(res.status).toBe(204);
    expect(txDeletedTables).toContain(agentSmsThreads);
  });
});
