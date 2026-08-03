/**
 * ai-summary.test.ts
 *
 * Smoke tests for the AI surf summary OpenAI integration.
 *
 * These tests catch the class of silent breakage where a model name change or
 * unsupported parameter causes the AI summary endpoint to return a 500 in
 * production without any build-time warning.
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type OpenAI from "openai";
import { generateSurfSummary, AI_SUMMARY_MODEL, AI_SUMMARY_PARAMS } from "./ai-summary-helper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal OpenAI mock client. */
function makeClient(impl: () => Promise<any>): OpenAI {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(impl),
      },
    },
  } as unknown as OpenAI;
}

/** Build a synthetic OpenAI 4xx error similar to what the SDK throws. */
function makeOpenAIError(status: number, message: string): Error {
  const err = new Error(message) as any;
  err.status = status;
  err.type = "invalid_request_error";
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateSurfSummary — happy path", () => {
  it("returns non-empty summary text when OpenAI responds successfully", async () => {
    const expectedSummary =
      "Clean 4-5ft sets rolling in from the NW at 14s with light offshore winds keeping faces glassy. Tide is pushing high around 9am — tomorrow looks similar with slightly smaller surf.";

    const client = makeClient(async () => ({
      choices: [{ message: { content: expectedSummary } }],
    }));

    const result = await generateSurfSummary(client, {
      locationName: "Mavericks",
      region: "California",
      prompt: "Describe current surf conditions.",
    });

    expect(result).toBe(expectedSummary);
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("uses the correct model name", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Waist-high and gutless." } }],
    });
    const client = { chat: { completions: { create: createMock } } } as unknown as OpenAI;

    await generateSurfSummary(client, {
      locationName: "Test Spot",
      region: "Test Region",
      prompt: "Describe conditions.",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.model).toBe(AI_SUMMARY_MODEL);
  });

  it("sends max_completion_tokens (not deprecated max_tokens)", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Solid overhead lefts peeling off the point." } }],
    });
    const client = { chat: { completions: { create: createMock } } } as unknown as OpenAI;

    await generateSurfSummary(client, {
      locationName: "Test Spot",
      region: "Test Region",
      prompt: "Describe conditions.",
    });

    const callArgs = createMock.mock.calls[0][0];
    // max_completion_tokens must be present — this is what fixed the original breakage
    expect(callArgs.max_completion_tokens).toBe(AI_SUMMARY_PARAMS.max_completion_tokens);
    // max_tokens must NOT be present — it is unsupported by newer models
    expect(callArgs.max_tokens).toBeUndefined();
  });
});

describe("generateSurfSummary — OpenAI error paths", () => {
  it("throws clearly when the model name is invalid (404)", async () => {
    const client = makeClient(async () => {
      throw makeOpenAIError(404, "The model `gpt-bad-model` does not exist");
    });

    await expect(
      generateSurfSummary(client, {
        locationName: "Pipeline",
        region: "Hawaii",
        prompt: "Describe conditions.",
      })
    ).rejects.toThrow("does not exist");
  });

  it("throws clearly when a parameter is unsupported (400)", async () => {
    const client = makeClient(async () => {
      throw makeOpenAIError(
        400,
        "Unrecognized request argument supplied: max_tokens"
      );
    });

    await expect(
      generateSurfSummary(client, {
        locationName: "Trestles",
        region: "California",
        prompt: "Describe conditions.",
      })
    ).rejects.toThrow("max_tokens");
  });

  it("throws clearly on auth failure (401)", async () => {
    const client = makeClient(async () => {
      throw makeOpenAIError(401, "Invalid API key provided");
    });

    await expect(
      generateSurfSummary(client, {
        locationName: "Bells Beach",
        region: "Australia",
        prompt: "Describe conditions.",
      })
    ).rejects.toThrow("Invalid API key");
  });

  it("throws when OpenAI returns an empty response body", async () => {
    const client = makeClient(async () => ({
      choices: [{ message: { content: "" } }],
    }));

    await expect(
      generateSurfSummary(client, {
        locationName: "Hossegor",
        region: "France",
        prompt: "Describe conditions.",
      })
    ).rejects.toThrow("empty response");
  });

  it("throws when choices array is empty", async () => {
    const client = makeClient(async () => ({
      choices: [],
    }));

    await expect(
      generateSurfSummary(client, {
        locationName: "Jeffreys Bay",
        region: "South Africa",
        prompt: "Describe conditions.",
      })
    ).rejects.toThrow("empty response");
  });
});
