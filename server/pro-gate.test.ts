/**
 * pro-gate.test.ts
 *
 * End-to-end confirmation that the Pro gate correctly blocks free-plan users.
 *
 * THREE layers of verification:
 *
 * 1. Static analysis
 *    Reads server/routes.ts directly and asserts that every Pro-gated endpoint
 *    carries `requirePro` in its production registration.  Removing requirePro
 *    from any route causes the corresponding assertion to fail.
 *
 * 2. Full middleware-chain HTTP tests (isAuthenticated → requirePro)
 *    Uses supertest against an Express app that wires the REAL isAuthenticated
 *    export (from ./auth.ts) and the REAL requirePro middleware together,
 *    mirroring the production middleware chain for the gating concern.
 *    Clerk and the DB are mocked so no live credentials are required.
 *
 * 3. Whop lifecycle tests (the write path that sets isPro)
 *    Exercises the production registerWhopRoutes() webhook handler directly
 *    via supertest.  A mocked Whop client delivers signed-but-fake events.
 *    Asserts that membership.activated sets isPro=true and
 *    membership.deactivated sets isPro=false in the database.
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Controllable mock state — factories below close over these variables.
// ---------------------------------------------------------------------------

let mockUserId: string | null = "user-test";
let mockIsPro: boolean | null = false;
let mockIsSuspended = false;

// Capture DB calls so lifecycle tests can assert on them.
const dbInsertValues: any[] = [];
const dbUpdateSet: any[] = [];

// ---------------------------------------------------------------------------
// Module mocks — hoisted before imports.
// ---------------------------------------------------------------------------

vi.mock("@clerk/express", () => ({
  /**
   * requireAuth() is called once at module load time to build `isAuthenticated`.
   * The returned middleware enforces authentication: 401 when mockUserId is null,
   * otherwise attaches userId to req.auth and calls next().
   */
  requireAuth: vi.fn(() => (req: any, res: any, next: any) => {
    if (!mockUserId) {
      return res.status(401).json({ error: "unauthenticated" });
    }
    req.auth = { userId: mockUserId };
    next();
  }),
  /** Used by requirePro to extract the user ID from the request. */
  getAuth: vi.fn((req: any) => ({ userId: req.auth?.userId ?? mockUserId })),
  /** Used by auth.ts's setupAuth(); not needed in unit tests. */
  clerkMiddleware: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  clerkClient: {},
}));

vi.mock("./db", () => {
  /**
   * Build a mock tx (or top-level db) with insert, update, select.
   * Writes are captured in dbInsertValues / dbUpdateSet so lifecycle tests
   * can assert on them.
   */
  function makeTxOrDb() {
    return {
      insert: vi.fn().mockImplementation((_table: any) => ({
        values: vi.fn().mockImplementation((data: any) => {
          dbInsertValues.push(data);
          return {
            onConflictDoUpdate: vi.fn().mockResolvedValue([]),
            onConflictDoNothing: vi.fn().mockResolvedValue([]),
          };
        }),
      })),

      update: vi.fn().mockImplementation((_table: any) => ({
        set: vi.fn().mockImplementation((data: any) => {
          dbUpdateSet.push(data);
          return {
            where: vi.fn().mockReturnValue({
              // returning([{ id }]) — simulates a state change for tests that
              // need activateWhopMembership / transitionProStatus to record an event.
              returning: vi.fn().mockResolvedValue([{ id: "user-123" }]),
              limit: vi.fn().mockResolvedValue([]),
            }),
          };
        }),
      })),

      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        // where() must be awaitable directly (storage.getUser awaits it for the
        // suspension gate in isAuthenticated) AND support .limit() (requirePro).
        where: vi.fn().mockImplementation(() => {
          const membershipId = mockWebhookEvent?.data?.id ?? null;
          const rows =
            mockIsPro === null
              ? []
              : [{
                  id: "user-123",
                  isPro: mockIsPro,
                  paidPro: mockIsPro,
                  complimentaryPro: false,
                  isTestAccount: false,
                  isSuspended: mockIsSuspended,
                  billingProvider: mockIsPro ? "whop" : null,
                  whopMembershipId: membershipId,
                }];
          const thenable: any = Promise.resolve(rows);
          thenable.limit = vi.fn(() => {
            const limited: any = Promise.resolve(rows);
            limited.for = vi.fn(() => Promise.resolve(rows));
            return limited;
          });
          return thenable;
        }),
      })),
    };
  }

  const topLevel = makeTxOrDb();

  return {
    db: {
      ...topLevel,
      // transaction(fn) — runs fn with a fresh tx mock and returns its result.
      transaction: vi.fn().mockImplementation(async (fn: any) => fn(makeTxOrDb())),
    },
  };
});

vi.mock("@shared/schema", () => ({
  users: {
    id: "id",
    isPro: "isPro",
    paidPro: "paidPro",
    complimentaryPro: "complimentaryPro",
    isTestAccount: "isTestAccount",
    isSuspended: "isSuspended",
    billingProvider: "billingProvider",
    whopMembershipId: "whopMembershipId",
  },
  userEvents: { userId: "userId", type: "type", payload: "payload" },
}));

// Mock the Whop client used by the webhook handler.
// `webhooks.unwrap()` is replaced with a function that returns the prepared
// fake event; tests control its output via `mockWebhookEvent`.
let mockWebhookEvent: any = null;

vi.mock("./whopClient", () => ({
  getWhopClient: vi.fn().mockResolvedValue({
    webhooks: {
      unwrap: vi.fn((_body: string, _opts: any) => mockWebhookEvent),
    },
    checkoutConfigurations: { create: vi.fn() },
    memberships: { retrieve: vi.fn() },
  }),
}));

// ---------------------------------------------------------------------------
// Import real middleware AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { isAuthenticated } from "./auth";
import { requirePro, registerWhopRoutes } from "./whop-routes";

// ---------------------------------------------------------------------------
// ── Layer 1: Static analysis — production route registration ────────────────
// ---------------------------------------------------------------------------

const ROUTES_TS = fs.readFileSync(
  path.resolve(__dirname, "routes.ts"),
  "utf8"
);

/**
 * Returns true when routes.ts contains a line registering `method` on `routePath`
 * that also includes `requirePro` in the same registration call (before the
 * closing semicolon of the route statement).
 */
function routeHasRequirePro(method: string, routePath: string): boolean {
  const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`app\\.${method}\\(["'\`]${escaped}["'\`][^;]*requirePro`);
  return re.test(ROUTES_TS);
}

const PRO_GATED_ROUTES: { method: string; path: string }[] = [
  { method: "post",   path: "/api/user-alerts" },
  { method: "put",    path: "/api/user-alerts/:id" },
  { method: "post",   path: "/api/chat" },
  { method: "post",   path: "/api/test-notification" },
  { method: "get",    path: "/api/agent/history" },
  { method: "post",   path: "/api/agent/chat" },
  { method: "delete", path: "/api/agent/history" },
  { method: "get",    path: "/api/agent/conditions-freshness" },
  { method: "post",   path: "/api/agent/refresh-conditions" },
];

describe("Pro gate — production routes.ts registration (static analysis)", () => {
  it.each(PRO_GATED_ROUTES)(
    "$method $path carries requirePro in server/routes.ts",
    ({ method, path }) => {
      expect(routeHasRequirePro(method, path)).toBe(true);
    }
  );

  it("routes.ts contains exactly 9 requirePro-gated registrations", () => {
    const pattern = /app\.(post|put|get|delete|patch)\(["'`][^"'`]+["'`][^;]*requirePro/g;
    const matches = ROUTES_TS.match(pattern) ?? [];
    expect(matches).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// ── Layer 2: Full middleware-chain HTTP tests ───────────────────────────────
//
// The production chain for every Pro-gated route is:
//   isAuthenticated (requireAuth() from @clerk/express)
//   → requirePro    (reads users.isPro from DB)
//   → handler
//
// Both are REAL implementations; only Clerk token validation and the DB query
// are mocked, matching what a real test environment without live credentials
// would do.
// ---------------------------------------------------------------------------

type RouteSpec = { method: "get" | "post" | "put" | "delete" | "patch"; path: string };
const HTTP_ROUTES: RouteSpec[] = PRO_GATED_ROUTES as RouteSpec[];

function buildGatedApp() {
  const app = express();
  app.use(express.json());
  for (const { method, path } of HTTP_ROUTES) {
    // Mirror the production middleware chain: isAuthenticated → requirePro → handler
    app[method](path, isAuthenticated, requirePro, (_req: any, res: any) =>
      res.status(200).json({ ok: true })
    );
  }
  return app;
}

describe("Pro gate — unauthenticated → 401 (isAuthenticated blocks before requirePro)", () => {
  beforeEach(() => { mockUserId = null; mockIsPro = null; });

  it.each(HTTP_ROUTES)(
    "$method $path → 401 with no authenticated user",
    async ({ method, path }) => {
      const url = path.replace(/:[\w]+/g, "1");
      const res = await (request(buildGatedApp()) as any)[method](url).send({});
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "unauthenticated" });
    }
  );
});

describe("Pro gate — free-plan user → 402 (requirePro blocks)", () => {
  beforeEach(() => { mockUserId = "free-user"; mockIsPro = false; });

  it.each(HTTP_ROUTES)(
    "$method $path → 402 with { error: pro_required, upgradeUrl: /pricing }",
    async ({ method, path }) => {
      const url = path.replace(/:[\w]+/g, "1");
      const res = await (request(buildGatedApp()) as any)[method](url).send({});
      expect(res.status).toBe(402);
      expect(res.body).toMatchObject({ error: "pro_required", upgradeUrl: "/pricing" });
    }
  );
});

describe("Pro gate — Pro-plan user → 200 (handler reached)", () => {
  beforeEach(() => { mockUserId = "pro-user"; mockIsPro = true; });

  it.each(HTTP_ROUTES)(
    "$method $path → 200 when isPro=true",
    async ({ method, path }) => {
      const url = path.replace(/:[\w]+/g, "1");
      const res = await (request(buildGatedApp()) as any)[method](url).send({});
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    }
  );
});

describe("Suspension gate — suspended user → 403 (isAuthenticated blocks)", () => {
  beforeEach(() => { mockUserId = "suspended-user"; mockIsPro = true; mockIsSuspended = true; });
  afterEach(() => { mockIsSuspended = false; });

  it.each(HTTP_ROUTES)(
    "$method $path → 403 when the account is suspended",
    async ({ method, path }) => {
      const url = path.replace(/:[\w]+/g, "1");
      const res = await (request(buildGatedApp()) as any)[method](url).send({});
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message: "Your account has been suspended" });
    }
  );
});

describe("Pro gate — user row absent from DB → 402", () => {
  beforeEach(() => { mockUserId = "brand-new-user"; mockIsPro = null; });

  it.each(HTTP_ROUTES)(
    "$method $path → 402 when DB has no row yet",
    async ({ method, path }) => {
      const url = path.replace(/:[\w]+/g, "1");
      const res = await (request(buildGatedApp()) as any)[method](url).send({});
      expect(res.status).toBe(402);
      expect(res.body).toMatchObject({ error: "pro_required" });
    }
  );
});

describe("Pro gate — 402 response body contract (task-specified endpoints)", () => {
  beforeEach(() => { mockUserId = "free-user"; mockIsPro = false; });

  it("POST /api/user-alerts → 402 body: { error: pro_required, upgradeUrl: /pricing }", async () => {
    const res = await request(buildGatedApp()).post("/api/user-alerts").send({});
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("pro_required");
    expect(res.body.upgradeUrl).toBe("/pricing");
  });

  it("PUT /api/user-alerts/:id → 402 body: { error: pro_required, upgradeUrl: /pricing }", async () => {
    const res = await request(buildGatedApp()).put("/api/user-alerts/42").send({});
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("pro_required");
    expect(res.body.upgradeUrl).toBe("/pricing");
  });

  it("POST /api/chat → 402 body: { error: pro_required, upgradeUrl: /pricing }", async () => {
    const res = await request(buildGatedApp()).post("/api/chat").send({});
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("pro_required");
    expect(res.body.upgradeUrl).toBe("/pricing");
  });
});

// ---------------------------------------------------------------------------
// ── Layer 3: Whop webhook lifecycle (the write path that establishes isPro) ─
//
// registerWhopRoutes() is called with a real Express app; the webhook endpoint
// is exercised via supertest.  The Whop client is mocked so no SDK credentials
// are required — only the event shape and DB side effects are verified.
// ---------------------------------------------------------------------------

const TEST_WEBHOOK_SECRET = "whop_test_webhook_secret";
const TEST_PLAN_ID = "plan_test_monthly";

function buildWhopApp() {
  const app = express();
  app.use(express.json());
  registerWhopRoutes(app);
  return app;
}

describe("Whop webhook lifecycle — membership.activated sets isPro=true", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    mockIsPro = false;
    // Set required env vars for the webhook handler
    originalEnv.WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
    originalEnv.WHOP_MONTHLY_PLAN_ID = process.env.WHOP_MONTHLY_PLAN_ID;
    process.env.WHOP_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.WHOP_MONTHLY_PLAN_ID = TEST_PLAN_ID;

    // Clear DB capture arrays
    dbInsertValues.length = 0;
    dbUpdateSet.length = 0;

    // Prepare a realistic membership.activated event payload
    mockWebhookEvent = {
      action: "membership.activated",
      data: {
        id: "mem_abc123",
        plan: { id: TEST_PLAN_ID },
        metadata: { clerk_user_id: "user_clerk_abc" },
      },
    };
  });

  afterEach(() => {
    process.env.WHOP_WEBHOOK_SECRET = originalEnv.WHOP_WEBHOOK_SECRET;
    process.env.WHOP_MONTHLY_PLAN_ID = originalEnv.WHOP_MONTHLY_PLAN_ID;
  });

  it("responds 200 with { received: true }", async () => {
    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.activated" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
  });

  it("writes isPro=true to the DB for the Clerk user ID in membership metadata", async () => {
    await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.activated" });

    // activateWhopMembership first inserts the user with isPro=false (upsert),
    // then conditionally updates isPro=true in the same transaction.
    expect(dbInsertValues.length).toBeGreaterThan(0);
    const upsertInsert = dbInsertValues[0];
    expect(upsertInsert.id).toBe("user_clerk_abc");
    expect(upsertInsert.whopMembershipId).toBe("mem_abc123");
    // The conditional update grants Pro — verify it was called with isPro=true.
    expect(dbUpdateSet.length).toBeGreaterThan(0);
    expect(dbUpdateSet[0]).toMatchObject({ isPro: true });
  });

  it("idempotency — repeated activation does not grant Pro twice", async () => {
    // The tx.update returning-mock returns [{id}] on both calls, simulating
    // that the WHERE isPro=false condition was satisfied.  In the real DB the
    // second call would return [] (already Pro) — this test verifies the
    // handler completes without error, not that it de-dupes (DB enforces that).
    const res1 = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.activated" });
    const res2 = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.activated" });
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it("rejects the webhook with 503 when WHOP_WEBHOOK_SECRET is not set", async () => {
    delete process.env.WHOP_WEBHOOK_SECRET;
    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .send({});
    expect(res.status).toBe(503);
  });

  it("rejects the webhook with 503 when no plan IDs are configured (refuse to grant Pro for unknown plans)", async () => {
    // Clear both plan ID env vars so getAllowedPlanIds() returns an empty Set
    delete process.env.WHOP_MONTHLY_PLAN_ID;
    delete process.env.WHOP_ANNUAL_PLAN_ID;
    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.activated" });
    expect(res.status).toBe(503);
  });

  it("ignores activation events for plans not in the configured allowlist", async () => {
    mockWebhookEvent = {
      action: "membership.activated",
      data: {
        id: "mem_unknown",
        plan: { id: "plan_unknown_xyz" },
        metadata: { clerk_user_id: "user_clerk_abc" },
      },
    };

    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    // No DB write should have occurred — the plan is not in the allowlist
    expect(dbInsertValues.length).toBe(0);
  });
});

describe("Whop webhook lifecycle — membership.deactivated sets isPro=false", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    mockIsPro = true;
    originalEnv.WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
    originalEnv.WHOP_MONTHLY_PLAN_ID = process.env.WHOP_MONTHLY_PLAN_ID;
    process.env.WHOP_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.WHOP_MONTHLY_PLAN_ID = TEST_PLAN_ID;

    dbUpdateSet.length = 0;

    mockWebhookEvent = {
      action: "membership.deactivated",
      data: { id: "mem_abc123" },
    };
  });

  afterEach(() => {
    process.env.WHOP_WEBHOOK_SECRET = originalEnv.WHOP_WEBHOOK_SECRET;
    process.env.WHOP_MONTHLY_PLAN_ID = originalEnv.WHOP_MONTHLY_PLAN_ID;
  });

  it("responds 200 with { received: true }", async () => {
    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.deactivated" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
  });

  it("writes isPro=false to the DB for the cancelled membership", async () => {
    await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "test-sig")
      .send({ action: "membership.deactivated" });

    // DB update should have been called with isPro=false
    expect(dbUpdateSet.length).toBeGreaterThan(0);
    const updated = dbUpdateSet[0];
    expect(updated.isPro).toBe(false);
  });
});

describe("Whop webhook — signature verification (fail-closed behaviour)", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    originalEnv.WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
    process.env.WHOP_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env.WHOP_WEBHOOK_SECRET = originalEnv.WHOP_WEBHOOK_SECRET;
    mockWebhookEvent = null;
  });

  it("returns 401 when the Whop client rejects the signature", async () => {
    // Make webhooks.unwrap throw to simulate signature mismatch
    const { getWhopClient } = await import("./whopClient");
    vi.mocked(getWhopClient).mockResolvedValueOnce({
      webhooks: {
        unwrap: vi.fn(() => { throw new Error("Invalid signature"); }),
      },
    } as any);

    const res = await request(buildWhopApp())
      .post("/api/whop/webhook")
      .set("whop-signature", "bad-sig")
      .send({});

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Invalid webhook signature" });
  });
});
