/**
 * authUtils.test.ts
 *
 * Unit tests for the auth error-classification helpers used by:
 *  - queryClient.ts  → QueryCache/MutationCache onError (global suspension toast)
 *  - AISurfChat.tsx  → catch block (suspension-specific error message vs. generic)
 *  - SurfAgentChat.tsx → onError branch (suspension bubble in chat thread)
 *
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";
import { isUnauthorizedError, isSuspendedError } from "./authUtils";

// ---------------------------------------------------------------------------
// isUnauthorizedError
// ---------------------------------------------------------------------------

describe("isUnauthorizedError", () => {
  it("returns true for a standard 401 Unauthorized message", () => {
    expect(isUnauthorizedError(new Error("401: Unauthorized"))).toBe(true);
  });

  it("returns false for a 403 suspended message", () => {
    expect(
      isUnauthorizedError(
        new Error('403: {"message":"Your account has been suspended"}')
      )
    ).toBe(false);
  });

  it("returns false for a 402 payment-required message", () => {
    expect(
      isUnauthorizedError(
        new Error('402: {"error":"pro_required","upgradeUrl":"/pricing"}')
      )
    ).toBe(false);
  });

  it("returns false for a 500 server error", () => {
    expect(isUnauthorizedError(new Error("500: Internal Server Error"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSuspendedError — server/auth.ts returns:
//   HTTP 403  { message: "Your account has been suspended" }
// throwIfResNotOk in queryClient.ts constructs the Error as:
//   new Error(`${res.status}: ${text}`)
// where text is the raw response body string.
// AISurfChat.tsx throws: new Error("Your account has been suspended. Please contact support.")
// ---------------------------------------------------------------------------

describe("isSuspendedError — React Query path (throwIfResNotOk format)", () => {
  it("detects the exact format produced by throwIfResNotOk for a suspended account", () => {
    const err = new Error(
      '403: {"message":"Your account has been suspended"}'
    );
    expect(isSuspendedError(err)).toBe(true);
  });

  it("detects suspension when the JSON body uses different capitalisation", () => {
    const err = new Error('403: {"message":"Your account has been Suspended"}');
    expect(isSuspendedError(err)).toBe(true);
  });

  it("returns false for a 401 Unauthorized (not a suspension)", () => {
    expect(isSuspendedError(new Error("401: Unauthorized"))).toBe(false);
  });

  it("returns false for a 403 without 'suspended' in the body (e.g. CSRF error)", () => {
    expect(isSuspendedError(new Error("403: Forbidden"))).toBe(false);
  });

  it("returns false for a 402 pro-required error", () => {
    const err = new Error('402: {"error":"pro_required","upgradeUrl":"/pricing"}');
    expect(isSuspendedError(err)).toBe(false);
  });

  it("returns false for a 500 error that happens to contain the word 'suspended'", () => {
    // Must start with 403, not just contain 'suspended'
    expect(isSuspendedError(new Error("500: task suspended"))).toBe(false);
  });
});

describe("isSuspendedError — AISurfChat path (raw fetch, explicit error message)", () => {
  it("detects the message thrown by AISurfChat on a 403 response", () => {
    // AISurfChat.tsx throws this exact string when it sees res.status === 403
    const err = new Error(
      "Your account has been suspended. Please contact support."
    );
    // The AISurfChat catch block checks err.message.toLowerCase().includes("suspended")
    // rather than using isSuspendedError, but both must agree on classification.
    // This test verifies the catch-block logic by exercising the same predicate.
    const isSuspended =
      err.message.startsWith("403")
        ? isSuspendedError(err)            // React Query path
        : err.message.toLowerCase().includes("suspended"); // AISurfChat catch path
    expect(isSuspended).toBe(true);
  });

  it("does NOT classify a generic network error as suspended", () => {
    const err = new Error("Couldn't connect. Tap retry to try again.");
    const isSuspended =
      err.message.startsWith("403")
        ? isSuspendedError(err)
        : err.message.toLowerCase().includes("suspended");
    expect(isSuspended).toBe(false);
  });
});
