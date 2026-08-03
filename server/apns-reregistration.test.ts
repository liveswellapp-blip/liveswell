/**
 * apns-reregistration.test.ts
 *
 * Validates the APNs token re-registration path that fires on every fresh iOS
 * install.  Two properties are exercised against the real production modules:
 *
 *  1. DatabaseStorage.addApnsDeviceToken() — upsert behaviour (same token is
 *     never duplicated; different tokens per-user coexist; other users are
 *     untouched; stale tokens survive until pruned at send-time).
 *
 *  2. ApnsService.sendToUser() — stale-token pruning behaviour (BadDeviceToken
 *     / Unregistered tokens are removed while valid tokens still receive the
 *     notification in the same send pass).
 *
 * Storage tests hit the real Neon/PostgreSQL database so the actual drizzle
 * queries and SQL constraints are exercised.  Each test uses a unique userId
 * prefix and is cleaned up in afterEach so it leaves no residue.
 *
 * ApnsService tests mock `apns2` (no real Apple network calls) and inject a
 * controlled storage stub so only the service orchestration logic is under test.
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock apns2 BEFORE importing the service so the constructor gets a fake client.
// vi.hoisted() runs before vi.mock() so the shared send mock is accessible in
// both the factory and the test body.
// ---------------------------------------------------------------------------
const mockApnsClientSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("apns2", () => {
  // Must use regular function declarations so `new ApnsClient()` works.
  function MockApnsClient(this: any) {
    this.send = mockApnsClientSend;
  }
  function MockNotification(this: any, token: string) {
    this.deviceToken = token;
  }
  return { ApnsClient: MockApnsClient, Notification: MockNotification };
});

// ---------------------------------------------------------------------------
// Imports — after the mock is registered
// ---------------------------------------------------------------------------
import { DatabaseStorage } from "./storage";
import { ApnsService } from "./apns-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A new storage instance per test to avoid any module-level shared state. */
function makeStore() {
  return new DatabaseStorage();
}

/** Unique user ID for each test invocation to prevent cross-test interference. */
let testUserCounter = 0;
function freshUserId() {
  return `test-apns-${Date.now()}-${++testUserCounter}`;
}

// ---------------------------------------------------------------------------
// 1. DatabaseStorage — addApnsDeviceToken upsert / re-registration
// ---------------------------------------------------------------------------

describe("DatabaseStorage.addApnsDeviceToken — re-registration upsert", () => {
  const store = makeStore();
  const userIds: string[] = [];

  afterEach(async () => {
    // Clean up every test user created in this suite
    for (const uid of userIds) {
      await store.removeAllUserApnsDeviceTokens(uid).catch(() => {});
    }
    userIds.length = 0;
  });

  it("stores a token the first time it is registered", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    await store.addApnsDeviceToken(uid, "token-A");

    const tokens = await store.getApnsDeviceTokens(uid);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].deviceToken).toBe("token-A");
    expect(tokens[0].userId).toBe(uid);
  });

  it("does not create a duplicate when the identical token is re-registered", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    await store.addApnsDeviceToken(uid, "stable-token");
    await store.addApnsDeviceToken(uid, "stable-token"); // same call again (e.g. app re-launch)

    const tokens = await store.getApnsDeviceTokens(uid);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].deviceToken).toBe("stable-token");
  });

  it("adds the new token on reinstall without removing the stale one (pruning happens at send-time)", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    // First install
    await store.addApnsDeviceToken(uid, "stale-token");

    // Reinstall — iOS issues a brand-new token
    await store.addApnsDeviceToken(uid, "new-token");

    // Both tokens coexist in DB; the stale one is pruned by the next failed send
    const tokens = await store.getApnsDeviceTokens(uid);
    expect(tokens).toHaveLength(2);
    const values = tokens.map((t) => t.deviceToken);
    expect(values).toContain("stale-token");
    expect(values).toContain("new-token");
  });

  it("allows different tokens for the same user across multiple devices", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    await store.addApnsDeviceToken(uid, "iphone-token");
    await store.addApnsDeviceToken(uid, "ipad-token");

    const tokens = await store.getApnsDeviceTokens(uid);
    expect(tokens).toHaveLength(2);
    expect(tokens.map((t) => t.deviceToken).sort()).toEqual(["ipad-token", "iphone-token"]);
  });

  it("keeps other users' tokens untouched when one user re-registers", async () => {
    const uidA = freshUserId();
    const uidB = freshUserId();
    userIds.push(uidA, uidB);

    await store.addApnsDeviceToken(uidA, "token-A");
    await store.addApnsDeviceToken(uidB, "token-B");

    // user-A reinstalls — registers a new token
    await store.addApnsDeviceToken(uidA, "token-A-new");

    // user-A now has 2 tokens (old + new)
    const aTokens = await store.getApnsDeviceTokens(uidA);
    expect(aTokens).toHaveLength(2);
    expect(aTokens.map((t) => t.deviceToken)).toContain("token-A-new");

    // user-B must be completely unaffected
    const bTokens = await store.getApnsDeviceTokens(uidB);
    expect(bTokens).toHaveLength(1);
    expect(bTokens[0].deviceToken).toBe("token-B");
  });

  it("removeApnsDeviceToken removes exactly the specified token", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    await store.addApnsDeviceToken(uid, "tok-1");
    await store.addApnsDeviceToken(uid, "tok-2");

    const removed = await store.removeApnsDeviceToken(uid, "tok-1");
    expect(removed).toBe(true);

    const remaining = await store.getApnsDeviceTokens(uid);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].deviceToken).toBe("tok-2");
  });

  it("removeApnsDeviceToken returns false when the token does not exist", async () => {
    const uid = freshUserId();
    userIds.push(uid);

    const removed = await store.removeApnsDeviceToken(uid, "non-existent");
    expect(removed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. ApnsService.sendToUser — stale-token pruning (mocked apns2 + storage)
// ---------------------------------------------------------------------------

/**
 * Build a minimal storage stub that satisfies the storage interface subset
 * used by ApnsService.sendToUser.
 */
function makeStorageStub(
  initialTokens: string[],
  userId: string,
) {
  const rows = initialTokens.map((t) => ({
    id: 0,
    userId,
    deviceToken: t,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return {
    getApnsDeviceTokens: vi.fn().mockResolvedValue(rows),
    removeApnsDeviceToken: vi.fn().mockImplementation(async (_uid: string, token: string) => {
      const idx = rows.findIndex((r) => r.deviceToken === token);
      if (idx !== -1) rows.splice(idx, 1);
      return idx !== -1;
    }),
    _rows: rows,
  };
}

describe("ApnsService.sendToUser — stale-token pruning", () => {
  let svc: ApnsService;
  const PAYLOAD = { title: "Test", body: "Hello" };

  beforeEach(() => {
    // Each test gets a fresh service instance.  The apns2 mock ensures
    // APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID env vars are not needed — the
    // constructor will call `new ApnsClient(...)` which is now a vi.fn() that
    // returns a non-null object, so `this.client` is truthy.
    process.env.APNS_KEY     = "fake-key";
    process.env.APNS_KEY_ID  = "FAKEKEYID1";
    process.env.APNS_TEAM_ID = "FAKETEAMID";
    svc = new ApnsService();
  });

  afterEach(() => {
    delete process.env.APNS_KEY;
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    vi.restoreAllMocks();
  });

  it("returns 0 when the user has no registered tokens", async () => {
    svc._storage = makeStorageStub([], "user-1");
    const count = await svc.sendToUser("user-1", PAYLOAD);
    expect(count).toBe(0);
  });

  it("delivers to a valid token and does not prune it", async () => {
    const stub = makeStorageStub(["valid-token"], "user-1");
    svc._storage = stub;
    vi.spyOn(svc, "sendToToken").mockResolvedValue({ success: true, shouldDelete: false });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(1);
    expect(stub.removeApnsDeviceToken).not.toHaveBeenCalled();
  });

  it("prunes a stale token when Apple returns BadDeviceToken / Unregistered", async () => {
    const stub = makeStorageStub(["stale-token"], "user-1");
    svc._storage = stub;
    vi.spyOn(svc, "sendToToken").mockResolvedValue({ success: false, shouldDelete: true });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(0);
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledOnce();
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledWith("user-1", "stale-token");
  });

  it("delivers to the valid token and prunes the stale one in the same send pass", async () => {
    const stub = makeStorageStub(["stale-token", "valid-token"], "user-1");
    svc._storage = stub;

    vi.spyOn(svc, "sendToToken").mockImplementation(async (token: string) => {
      if (token === "stale-token") return { success: false, shouldDelete: true };
      return { success: true, shouldDelete: false };
    });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(1);
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledOnce();
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledWith("user-1", "stale-token");
  });

  it("continues delivering to all subsequent tokens after encountering a stale one", async () => {
    const stub = makeStorageStub(["stale-1", "valid-2", "valid-3"], "user-1");
    svc._storage = stub;

    const sendToTokenSpy = vi.spyOn(svc, "sendToToken").mockImplementation(async (token: string) => {
      if (token === "stale-1") return { success: false, shouldDelete: true };
      return { success: true, shouldDelete: false };
    });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(2);
    // All three tokens must have been attempted
    expect(sendToTokenSpy).toHaveBeenCalledTimes(3);
    // Only the stale one is pruned
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledOnce();
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledWith("user-1", "stale-1");
  });

  it("prunes all stale tokens and delivers to the valid one in a mixed batch", async () => {
    const stub = makeStorageStub(["stale-A", "stale-B", "valid-C"], "user-1");
    svc._storage = stub;

    vi.spyOn(svc, "sendToToken").mockImplementation(async (token: string) => {
      if (token === "valid-C") return { success: true, shouldDelete: false };
      return { success: false, shouldDelete: true };
    });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(1);
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledTimes(2);
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledWith("user-1", "stale-A");
    expect(stub.removeApnsDeviceToken).toHaveBeenCalledWith("user-1", "stale-B");
  });

  it("does not prune a token that fails with a transient error (shouldDelete=false)", async () => {
    const stub = makeStorageStub(["flaky-token"], "user-1");
    svc._storage = stub;
    // Network timeout or TooManyRequests — not a stale-token signal
    vi.spyOn(svc, "sendToToken").mockResolvedValue({ success: false, shouldDelete: false });

    const count = await svc.sendToUser("user-1", PAYLOAD);

    expect(count).toBe(0);
    expect(stub.removeApnsDeviceToken).not.toHaveBeenCalled();
  });

  it("sendToToken marks stale tokens with shouldDelete=true for BadDeviceToken", async () => {
    // Test sendToToken directly with a mock APNs client that throws
    const mockClient = (svc as any).client;
    mockClient.send = vi.fn().mockRejectedValue({ reason: "BadDeviceToken" });

    const result = await svc.sendToToken("stale-device-token", PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.shouldDelete).toBe(true);
  });

  it("sendToToken marks stale tokens with shouldDelete=true for Unregistered", async () => {
    const mockClient = (svc as any).client;
    mockClient.send = vi.fn().mockRejectedValue({ reason: "Unregistered" });

    const result = await svc.sendToToken("unregistered-token", PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.shouldDelete).toBe(true);
  });

  it("sendToToken does NOT set shouldDelete for transient failures", async () => {
    const mockClient = (svc as any).client;
    mockClient.send = vi.fn().mockRejectedValue({ reason: "TooManyRequests" });

    const result = await svc.sendToToken("some-token", PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.shouldDelete).toBe(false);
  });
});
