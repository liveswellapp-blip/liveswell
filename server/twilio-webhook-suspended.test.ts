/**
 * Confirms the inbound SMS webhook enforces account suspension:
 * a suspended user (even a Pro one) cannot use the SMS AI agent, while an
 * active Pro user still can. Twilio signature validation, the DB, storage,
 * and the surf agent are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

let mockUserRow: any = { isPro: true, isSuspended: false };
const runSurfAgentMock = vi.fn(async () => "Waves look fun today!");

vi.mock("twilio", () => ({
  default: { validateRequest: vi.fn(() => true) },
}));

vi.mock("./surf-agent", () => ({
  runSurfAgent: (...a: any[]) => runSurfAgentMock(...a),
}));

vi.mock("./storage", () => ({
  storage: {
    checkAndRecordInboundSmsRateLimit: vi.fn(async () => true),
    getUserAlerts: vi.fn(async () => []),
    updateUserAlert: vi.fn(async () => undefined),
  },
}));

vi.mock("./sms-service", () => ({
  normalizePhone: (p: string) => p,
}));

vi.mock("./db", async () => {
  const schema = await import("@shared/schema");
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => {
              if (table === schema.verifiedPhones) return [{ userId: "user_1" }];
              if (table === schema.users) return mockUserRow ? [mockUserRow] : [];
              return []; // agentSmsThreads → empty history
            }),
          })),
        })),
      })),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
    },
  };
});

import { handleIncomingSms } from "./twilio-webhook";

function buildApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.post("/api/twilio/incoming", handleIncomingSms);
  return app;
}

const send = (body: string) =>
  request(buildApp())
    .post("/api/twilio/incoming")
    .type("form")
    .send({ From: "+15551234567", Body: body });

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRow = { isPro: true, isSuspended: false };
});

describe("SMS agent suspension gate", () => {
  it("blocks a suspended user with a suspension message and never runs the agent", async () => {
    mockUserRow = { isPro: true, isSuspended: true };
    const res = await send("How are the waves?");
    expect(res.status).toBe(200);
    expect(res.text).toContain("suspended");
    expect(runSurfAgentMock).not.toHaveBeenCalled();
  });

  it("suspension takes precedence over the Pro upsell for suspended free users", async () => {
    mockUserRow = { isPro: false, isSuspended: true };
    const res = await send("How are the waves?");
    expect(res.text).toContain("suspended");
    expect(res.text).not.toContain("Pro feature");
  });

  it("still serves an active Pro user", async () => {
    const res = await send("How are the waves?");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Waves look fun today!");
    expect(runSurfAgentMock).toHaveBeenCalledOnce();
  });

  it("still blocks non-Pro (unsuspended) users with the upgrade message", async () => {
    mockUserRow = { isPro: false, isSuspended: false };
    const res = await send("How are the waves?");
    expect(res.text).toContain("Pro feature");
    expect(runSurfAgentMock).not.toHaveBeenCalled();
  });
});
