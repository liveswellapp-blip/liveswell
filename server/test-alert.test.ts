/**
 * test-alert.test.ts
 *
 * API-level tests for the production testAlertHandler imported directly from
 * server/test-alert-handler.ts — the same function registered in routes.ts at
 * POST /api/admin/test-alert.  SMSService and EmailService are mocked so no
 * real Twilio / Resend calls are made.
 *
 * Scenarios:
 *  1. Missing locationId → 400
 *  2. locationId = 0 (falsy int) → 400
 *  3. Non-numeric locationId → 400
 *  4. SMS channel with no toPhone → 400 (no valid recipient)
 *  5. Email channel with no toEmail → 400 (no valid recipient)
 *  6. Both channel with neither phone nor email → 400
 *  7. Happy-path SMS only → 200, results.sms = true, SMSService called correctly
 *  8. SMS failure (service returns false) → 200, results.sms = false, success = false
 *  9. Happy-path email only → 200, results.email = true, EmailService called correctly
 * 10. alertId forwarded to EmailService when provided
 * 11. Happy-path both channels → 200, both sms/email keys present
 * 12. Partial failure (SMS fails, email succeeds) → success = true
 * 13. All channels fail → success = false
 * 14. Response always contains boolean success and object results
 * 15. SMSService throws → 500 with message field
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before importing the handler so the mocked
// implementations are in place when the module is first imported.
// ---------------------------------------------------------------------------

const mockSmsSend = vi.fn<[], Promise<boolean>>();
vi.mock("./sms-service", () => ({
  SMSService: {
    sendDailyConditions: (...args: unknown[]) => mockSmsSend(...(args as [])),
  },
  PhoneConflictError: class PhoneConflictError extends Error {},
}));

const mockEmailSend = vi.fn<[], Promise<boolean>>();
vi.mock("./email-service", () => ({
  EmailService: {
    sendDailyConditions: (...args: unknown[]) => mockEmailSend(...(args as [])),
  },
}));

// ---------------------------------------------------------------------------
// Import the REAL handler after mocks are wired up.
// ---------------------------------------------------------------------------
import { testAlertHandler } from "./test-alert-handler";

// ---------------------------------------------------------------------------
// Minimal Express app — registers only the endpoint under test, bypassing the
// full server stack (auth middleware, DB connections, etc.).
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  // No auth middleware in tests — we are testing handler logic, not auth.
  app.post("/api/admin/test-alert", testAlertHandler);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/admin/test-alert", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Validation errors ────────────────────────────────────────────────────

  it("returns 400 when locationId is missing", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/locationId/i);
  });

  it("returns 400 when locationId is 0 (falsy integer)", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/locationId/i);
  });

  it("returns 400 when locationId is a non-numeric string", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/locationId/i);
  });

  it("returns 400 when channel is sms but toPhone is missing", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", locationId: 42 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No valid channel/i);
  });

  it("returns 400 when channel is email but toEmail is missing", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "email", locationId: 42 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No valid channel/i);
  });

  it("returns 400 when channel is both but neither phone nor email is provided", async () => {
    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "both", locationId: 42 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No valid channel/i);
  });

  // ── Happy-path: SMS only ─────────────────────────────────────────────────

  it("returns 200 with results.sms = true on a successful SMS send", async () => {
    mockSmsSend.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 7 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toEqual({ sms: true });
  });

  it("calls SMSService.sendDailyConditions with the correct arguments", async () => {
    mockSmsSend.mockResolvedValue(true);

    await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 7 });

    expect(mockSmsSend).toHaveBeenCalledOnce();
    expect(mockSmsSend).toHaveBeenCalledWith("admin-test", "+15550001234", 7);
  });

  it("returns 200 with results.sms = false and success = false when SMS service returns false", async () => {
    mockSmsSend.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 7 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.results).toEqual({ sms: false });
  });

  // ── Happy-path: email only ───────────────────────────────────────────────

  it("returns 200 with results.email = true on a successful email send", async () => {
    mockEmailSend.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "email", toEmail: "admin@example.com", locationId: 7 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toEqual({ email: true });
  });

  it("calls EmailService.sendDailyConditions with correct arguments (no alertId)", async () => {
    mockEmailSend.mockResolvedValue(true);

    await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "email", toEmail: "admin@example.com", locationId: 7 });

    expect(mockEmailSend).toHaveBeenCalledOnce();
    expect(mockEmailSend).toHaveBeenCalledWith("admin@example.com", 7, undefined);
  });

  it("forwards alertId to EmailService when provided", async () => {
    mockEmailSend.mockResolvedValue(true);

    await request(app)
      .post("/api/admin/test-alert")
      .send({
        channel: "email",
        toEmail: "admin@example.com",
        locationId: 7,
        alertId: 99,
      });

    expect(mockEmailSend).toHaveBeenCalledWith("admin@example.com", 7, 99);
  });

  // ── Happy-path: both channels ────────────────────────────────────────────

  it("returns 200 with both sms and email results when channel is 'both'", async () => {
    mockSmsSend.mockResolvedValue(true);
    mockEmailSend.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({
        channel: "both",
        toPhone: "+15550001234",
        toEmail: "admin@example.com",
        locationId: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toEqual({ sms: true, email: true });
  });

  it("success = true when at least one channel succeeds (partial failure)", async () => {
    mockSmsSend.mockResolvedValue(false);
    mockEmailSend.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({
        channel: "both",
        toPhone: "+15550001234",
        toEmail: "admin@example.com",
        locationId: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toEqual({ sms: false, email: true });
  });

  it("success = false when all channels fail", async () => {
    mockSmsSend.mockResolvedValue(false);
    mockEmailSend.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({
        channel: "both",
        toPhone: "+15550001234",
        toEmail: "admin@example.com",
        locationId: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.results).toEqual({ sms: false, email: false });
  });

  // ── Response shape ───────────────────────────────────────────────────────

  it("response always contains boolean 'success' and object 'results' keys", async () => {
    mockSmsSend.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 1 });

    expect(typeof res.body.success).toBe("boolean");
    expect(typeof res.body.results).toBe("object");
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it("returns 500 with a message field when SMSService throws", async () => {
    mockSmsSend.mockRejectedValue(new Error("Twilio 500"));

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "sms", toPhone: "+15550001234", locationId: 7 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 500 with a message field when EmailService throws", async () => {
    mockEmailSend.mockRejectedValue(new Error("Resend 429"));

    const res = await request(app)
      .post("/api/admin/test-alert")
      .send({ channel: "email", toEmail: "admin@example.com", locationId: 7 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message");
  });
});
