/**
 * whop-subscription-timeout.test.ts
 *
 * Confirms that GET /api/whop/subscription never shows "Free" to a user whose
 * DB row has isPro=true, even when the Whop API is unreachable or slow.
 *
 * Two failure modes are covered:
 *   1. getWhopClient() itself hangs (cold client, connector credential fetch stalls)
 *   2. getWhopClient() resolves but memberships.retrieve() throws a network error
 *
 * In both cases the response must be { isPro: true } because the DB is the
 * authoritative fast-path source for paying users.
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Controllable mock state
// ---------------------------------------------------------------------------

let mockUserId: string | null = "pro-user-id";
let mockUserRow: { isPro: boolean; whopMembershipId: string | null } | null = {
  isPro: true,
  whopMembershipId: "mem_test123",
};

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any real imports
// ---------------------------------------------------------------------------

vi.mock("@clerk/express", () => ({
  requireAuth: vi.fn(
    () => (req: any, _res: any, next: any) => {
      req.auth = { userId: mockUserId };
      next();
    },
  ),
  getAuth: vi.fn((req: any) => ({ userId: req.auth?.userId ?? mockUserId })),
  clerkMiddleware: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  clerkClient: {},
}));

vi.mock("./db", () => {
  return {
    db: {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          const rows = mockUserRow ? [mockUserRow] : [];
          const thenable: any = Promise.resolve(rows);
          thenable.limit = vi.fn(() => Promise.resolve(rows));
          return thenable;
        }),
      })),
      // Not exercised by the subscription GET, but needed to satisfy the import
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue([]) }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      transaction: vi.fn().mockImplementation(async (fn: any) => fn({})),
    },
  };
});

vi.mock("@shared/schema", () => ({
  users: { id: "id", isPro: "isPro", whopMembershipId: "whopMembershipId" },
  userEvents: { userId: "userId", type: "type", payload: "payload" },
}));

// getWhopClient is replaced per-test via vi.mocked(...).mockImplementationOnce
vi.mock("./whopClient", () => ({
  getWhopClient: vi.fn(),
}));

// pro-transitions doesn't need to write anything for these tests
vi.mock("./pro-transitions", () => ({
  transitionProStatus: vi.fn().mockResolvedValue({ changed: false }),
  activateWhopMembership: vi.fn().mockResolvedValue({ changed: false }),
}));

// ---------------------------------------------------------------------------
// Import real route handler AFTER mocks are in place
// ---------------------------------------------------------------------------

import { isAuthenticated } from "./auth";
import { registerWhopRoutes } from "./whop-routes";
import { getWhopClient } from "./whopClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSubscriptionApp() {
  const app = express();
  app.use(express.json());
  registerWhopRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/whop/subscription — Pro badge resilience to Whop API failures", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    originalEnv.WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
    originalEnv.WHOP_MONTHLY_PLAN_ID = process.env.WHOP_MONTHLY_PLAN_ID;
    process.env.WHOP_WEBHOOK_SECRET = "test-secret";
    process.env.WHOP_MONTHLY_PLAN_ID = "plan_monthly";
    mockUserId = "pro-user-id";
    mockUserRow = { isPro: true, whopMembershipId: "mem_test123" };
  });

  afterEach(() => {
    process.env.WHOP_WEBHOOK_SECRET = originalEnv.WHOP_WEBHOOK_SECRET;
    process.env.WHOP_MONTHLY_PLAN_ID = originalEnv.WHOP_MONTHLY_PLAN_ID;
    vi.clearAllMocks();
  });

  it("returns isPro=true when getWhopClient() itself never resolves (cold-client hang)", async () => {
    // getWhopClient returns a promise that never settles — simulates a stalled
    // connector credential fetch.  The 5-second timeout in the route handler
    // must kick in and fall back to the DB-cached isPro=true.
    vi.mocked(getWhopClient).mockImplementation(
      () => new Promise(() => { /* intentionally never resolves */ }),
    );

    const res = await request(buildSubscriptionApp())
      .get("/api/whop/subscription")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.isPro).toBe(true);
    // renewsAt is omitted when the live call did not succeed
    expect(res.body.renewsAt).toBeNull();
  }, 10_000 /* allow enough wall time for the 5s timeout to fire */);

  it("returns isPro=true when memberships.retrieve() throws a network error", async () => {
    // getWhopClient resolves fine but the API call itself fails
    vi.mocked(getWhopClient).mockResolvedValue({
      memberships: {
        retrieve: vi.fn().mockRejectedValue(new Error("Network error")),
      },
      webhooks: { unwrap: vi.fn() },
      checkoutConfigurations: { create: vi.fn() },
    } as any);

    const res = await request(buildSubscriptionApp())
      .get("/api/whop/subscription");

    expect(res.status).toBe(200);
    expect(res.body.isPro).toBe(true);
    expect(res.body.renewsAt).toBeNull();
  });

  it("returns isPro=false (free) when DB row has isPro=false and Whop API also errors", async () => {
    // A genuinely free user whose DB row is correct should still see Free
    mockUserRow = { isPro: false, whopMembershipId: "mem_free123" };

    vi.mocked(getWhopClient).mockResolvedValue({
      memberships: {
        retrieve: vi.fn().mockRejectedValue(new Error("Network error")),
      },
      webhooks: { unwrap: vi.fn() },
      checkoutConfigurations: { create: vi.fn() },
    } as any);

    const res = await request(buildSubscriptionApp())
      .get("/api/whop/subscription");

    expect(res.status).toBe(200);
    expect(res.body.isPro).toBe(false);
  });

  it("returns renewsAt when the live Whop call succeeds", async () => {
    const renewalTs = 1_800_000_000;

    vi.mocked(getWhopClient).mockResolvedValue({
      memberships: {
        retrieve: vi.fn().mockResolvedValue({
          status: "active",
          plan: { id: "plan_monthly" },
          renewal_period_end: renewalTs,
        }),
      },
      webhooks: { unwrap: vi.fn() },
      checkoutConfigurations: { create: vi.fn() },
    } as any);

    const res = await request(buildSubscriptionApp())
      .get("/api/whop/subscription");

    expect(res.status).toBe(200);
    expect(res.body.isPro).toBe(true);
    expect(res.body.renewsAt).toBe(renewalTs);
    expect(res.body.plan).toBe("monthly");
  });

  it("fast-paths to DB value without calling Whop when there is no whopMembershipId", async () => {
    // User has no membership ID yet (webhook may be delayed).
    // The fast path should return whatever isPro is in the DB without any Whop call.
    mockUserRow = { isPro: true, whopMembershipId: null };

    const res = await request(buildSubscriptionApp())
      .get("/api/whop/subscription");

    expect(res.status).toBe(200);
    expect(res.body.isPro).toBe(true);
    expect(vi.mocked(getWhopClient)).not.toHaveBeenCalled();
  });
});
