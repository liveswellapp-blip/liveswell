/**
 * alert-phone-verification.test.ts
 *
 * Integration tests for the PUT /api/user-alerts/:id route confirming that:
 *   1. A phone number change resets phoneVerified to false (new number is unverified)
 *   2. Providing the new number AFTER completing verification keeps phoneVerified true
 *   3. An unchanged phone number preserves the existing phoneVerified=true state
 *
 * Tests invoke the actual route handler in server/routes.ts via supertest.
 * Clerk auth middleware is mocked so the tests run without a live Clerk tenant.
 *
 * Run with:  npm test
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";

// ─── Auth mocks (must be hoisted above all other imports) ───────────────────

const TEST_USER_ID = "test-alert-phone-put-user";

// Mock the Clerk express middleware so requireAuth() is a simple pass-through
// that stamps TEST_USER_ID onto every request.
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (req: any, _res: any, next: any) => next(),
  requireAuth: () => (req: any, _res: any, next: any) => {
    req.auth = () => ({ userId: TEST_USER_ID });
    next();
  },
  getAuth: (_req: any) => ({ userId: TEST_USER_ID }),
  clerkClient: {
    users: {
      getUser: async () => ({
        emailAddresses: [{ emailAddress: "test@example.invalid" }],
        firstName: "Test",
        lastName: "User",
        imageUrl: null,
      }),
    },
  },
}));

// Mock the auth module so setupAuth() is a no-op (no session store or PgSession
// needed) and isAuthenticated is the same pass-through.
vi.mock("./auth", () => ({
  setupAuth: async (_app: any) => {},
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.auth = () => ({ userId: TEST_USER_ID });
    next();
  },
}));

// ─── Real imports (after mocks are registered) ───────────────────────────────

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { SMSService } from "./sms-service";
import { db } from "./db";
import {
  users,
  locations,
  userAlerts,
  verifiedPhones,
  phoneVerificationTokens,
} from "../shared/schema";
import { eq } from "drizzle-orm";

// ─── Test app bootstrap ──────────────────────────────────────────────────────

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

// ─── Per-test helpers ────────────────────────────────────────────────────────

let testCounter = 0;

function freshPhones() {
  const n = ++testCounter;
  const ts = Date.now();
  return {
    oldPhone: `+1555020${String(n).padStart(4, "0")}`,
    newPhone: `+1555021${String(n).padStart(4, "0")}`,
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

let currentLocationId: number;
let currentAlertId: number;
let currentOldPhone: string;
let currentNewPhone: string;

beforeEach(async () => {
  const phones = freshPhones();
  currentOldPhone = phones.oldPhone;
  currentNewPhone = phones.newPhone;

  // Ensure the test user row exists (FK parent for user_alerts).
  await db
    .insert(users)
    .values({ id: TEST_USER_ID })
    .onConflictDoNothing();

  // Insert a real location (required FK on user_alerts.location_id).
  const [loc] = await db
    .insert(locations)
    .values({
      name: `Test Beach ${testCounter}`,
      city: "Testville",
      country: "US",
      latitude: "34.0000000",
      longitude: "-118.0000000",
    })
    .returning();
  currentLocationId = loc.id;

  // Seed an alert that already has phoneVerified=true on the OLD phone.
  const [alert] = await db
    .insert(userAlerts)
    .values({
      userId: TEST_USER_ID,
      locationId: currentLocationId,
      alertType: "daily_report",
      deliveryChannels: ["sms"],
      frequency: "once_daily",
      notificationTime: "08:00",
      timezone: "America/New_York",
      phoneNumber: currentOldPhone,
      phoneVerified: true,
    })
    .returning();
  currentAlertId = alert.id;
});

afterEach(async () => {
  // Remove in FK-safe order.
  await db
    .delete(phoneVerificationTokens)
    .where(eq(phoneVerificationTokens.userId, TEST_USER_ID));
  await db
    .delete(verifiedPhones)
    .where(eq(verifiedPhones.userId, TEST_USER_ID));
  await db
    .delete(userAlerts)
    .where(eq(userAlerts.userId, TEST_USER_ID));
  await db
    .delete(locations)
    .where(eq(locations.id, currentLocationId));
  // Leave the TEST_USER_ID user row — it is reused across tests and deleted in
  // the last afterEach call without causing FK issues because child rows are
  // gone.  The onConflictDoNothing in beforeEach keeps it idempotent.
});

// ─── Tests — phone number changes ────────────────────────────────────────────

describe("PUT /api/user-alerts/:id — phone number changed", () => {
  it("returns phoneVerified=false when a new, unverified phone replaces a verified one", async () => {
    // New phone has NO entry in verified_phones, so isPhoneVerified returns false.
    const res = await request(app)
      .put(`/api/user-alerts/${currentAlertId}`)
      .send({
        locationId: currentLocationId,
        alertType: "daily_report",
        deliveryChannels: ["sms"],
        frequency: "once_daily",
        notificationTime: "08:00",
        timezone: "America/New_York",
        phoneNumber: currentNewPhone,
        // Client attempts to pass the old verified state — must be ignored.
        phoneVerified: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.phoneVerified).toBe(false);
    expect(res.body.phoneNumber).toBe(currentNewPhone);
  });

  it("persists phoneVerified=false in the DB after changing the phone number", async () => {
    await request(app)
      .put(`/api/user-alerts/${currentAlertId}`)
      .send({
        locationId: currentLocationId,
        alertType: "daily_report",
        deliveryChannels: ["sms"],
        frequency: "once_daily",
        notificationTime: "08:00",
        timezone: "America/New_York",
        phoneNumber: currentNewPhone,
        phoneVerified: true, // client-supplied — must be ignored
      });

    const [row] = await db
      .select()
      .from(userAlerts)
      .where(eq(userAlerts.id, currentAlertId));

    expect(row.phoneVerified).toBe(false);
    expect(row.phoneNumber).toBe(currentNewPhone);
  });

  it("returns phoneVerified=true when the new phone was already verified for this user", async () => {
    // Simulate the user completing the verification flow for the new phone
    // (i.e. they called /api/alerts/verify-phone/confirm first).
    await db.insert(verifiedPhones).values({
      userId: TEST_USER_ID,
      phone: currentNewPhone,
    });

    const res = await request(app)
      .put(`/api/user-alerts/${currentAlertId}`)
      .send({
        locationId: currentLocationId,
        alertType: "daily_report",
        deliveryChannels: ["sms"],
        frequency: "once_daily",
        notificationTime: "08:00",
        timezone: "America/New_York",
        phoneNumber: currentNewPhone,
        phoneVerified: false, // even if client sends false, server should find the verified row
      });

    expect(res.status).toBe(200);
    expect(res.body.phoneVerified).toBe(true);
  });
});

// ─── Tests — phone number unchanged ──────────────────────────────────────────

describe("PUT /api/user-alerts/:id — phone number unchanged", () => {
  it("preserves phoneVerified=true when the phone number has not changed", async () => {
    // PUT with the SAME phone that was already verified — must stay true.
    const res = await request(app)
      .put(`/api/user-alerts/${currentAlertId}`)
      .send({
        locationId: currentLocationId,
        alertType: "daily_report",
        deliveryChannels: ["sms"],
        frequency: "once_daily",
        notificationTime: "08:00",
        timezone: "America/New_York",
        phoneNumber: currentOldPhone, // unchanged
        phoneVerified: false, // client-supplied false must be overridden
      });

    expect(res.status).toBe(200);
    expect(res.body.phoneVerified).toBe(true);
    expect(res.body.phoneNumber).toBe(currentOldPhone);
  });

  it("persists phoneVerified=true in the DB when the phone number is unchanged", async () => {
    await request(app)
      .put(`/api/user-alerts/${currentAlertId}`)
      .send({
        locationId: currentLocationId,
        alertType: "daily_report",
        deliveryChannels: ["sms"],
        frequency: "once_daily",
        notificationTime: "08:00",
        timezone: "America/New_York",
        phoneNumber: currentOldPhone,
        phoneVerified: false,
      });

    const [row] = await db
      .select()
      .from(userAlerts)
      .where(eq(userAlerts.id, currentAlertId));

    expect(row.phoneVerified).toBe(true);
  });
});
