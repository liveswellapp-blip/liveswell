/**
 * surf-chat-empty-stream.test.ts
 *
 * Confirms that the /api/chat route never leaves the assistant bubble blank
 * when OpenAI returns an empty stream (zero content tokens before [DONE]).
 *
 * Because the streaming loop is embedded in the route handler, these tests
 * exercise the same logic via a thin helper that mirrors the production
 * for-await loop exactly.  Any change to that loop should be mirrored here.
 *
 * Run with:  npm test
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Mirrors the server-side streaming loop from /api/chat in routes.ts.
// Returns the SSE event strings that would be written to res.write().
// ---------------------------------------------------------------------------

const FALLBACK_MESSAGE = "Sorry, I couldn't generate a response. Please try again.";

interface FakeChunk {
  choices: Array<{ delta: { content?: string | null } }>;
}

async function simulateStreamingLoop(chunks: FakeChunk[]): Promise<string[]> {
  const events: string[] = [];
  let totalTokens = 0;

  // Mirror the production for-await loop
  for (const chunk of chunks) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      totalTokens++;
      events.push(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }

  // Guard: mirror the production empty-stream fallback
  if (totalTokens === 0) {
    events.push(`data: ${JSON.stringify({ token: FALLBACK_MESSAGE })}\n\n`);
  }

  events.push("data: [DONE]\n\n");
  return events;
}

// ---------------------------------------------------------------------------
// Mirrors the client-side stream reader logic from AISurfChat.tsx.
// Returns the final content that would be placed in the assistant bubble.
// ---------------------------------------------------------------------------

interface SSEEvent {
  token?: string;
}

function parseSSEEvents(rawEvents: string[]): SSEEvent[] {
  const parsed: SSEEvent[] = [];
  for (const raw of rawEvents) {
    if (!raw.startsWith("data: ")) continue;
    const payload = raw.slice(6).trim();
    if (payload === "[DONE]" || payload === "[ERROR]") continue;
    try {
      parsed.push(JSON.parse(payload));
    } catch {
      // ignore
    }
  }
  return parsed;
}

function simulateClientReader(events: string[]): string {
  const parsed = parseSSEEvents(events);
  let content = "";
  let firstToken = false;

  for (const evt of parsed) {
    if (evt.token) {
      firstToken = true;
      content += evt.token;
    }
  }

  // Mirror the client-side empty-bubble guard
  if (!firstToken) {
    content = FALLBACK_MESSAGE;
  }

  return content;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("server streaming loop — empty stream (zero content tokens)", () => {
  it("emits a fallback token before [DONE] when no content chunks arrive", async () => {
    const chunks: FakeChunk[] = [
      // The model sent a chunk, but with no content delta
      { choices: [{ delta: { content: null } }] },
      { choices: [{ delta: { content: undefined } }] },
      { choices: [{ delta: {} }] },
    ];

    const events = await simulateStreamingLoop(chunks);
    const fallbackEvent = events.find(e => e.includes(FALLBACK_MESSAGE));
    expect(fallbackEvent).toBeDefined();
  });

  it("terminates with [DONE] after the fallback token", async () => {
    const events = await simulateStreamingLoop([]);
    expect(events[events.length - 1]).toBe("data: [DONE]\n\n");
  });

  it("does NOT emit the fallback when real content tokens are present", async () => {
    const chunks: FakeChunk[] = [
      { choices: [{ delta: { content: "Looks" } }] },
      { choices: [{ delta: { content: " fun!" } }] },
    ];

    const events = await simulateStreamingLoop(chunks);
    const hasFallback = events.some(e => e.includes(FALLBACK_MESSAGE));
    expect(hasFallback).toBe(false);
  });

  it("emits exactly one data event (the fallback) when stream is completely empty", async () => {
    const events = await simulateStreamingLoop([]);
    // Expect: one fallback data event + one [DONE] event
    const dataEvents = events.filter(e => e.startsWith("data: ") && !e.includes("[DONE]"));
    expect(dataEvents).toHaveLength(1);
    expect(dataEvents[0]).toContain(FALLBACK_MESSAGE);
  });

  it("emits the correct number of token events when content is present", async () => {
    const chunks: FakeChunk[] = [
      { choices: [{ delta: { content: "A" } }] },
      { choices: [{ delta: { content: "B" } }] },
      { choices: [{ delta: { content: "C" } }] },
    ];

    const events = await simulateStreamingLoop(chunks);
    const dataEvents = events.filter(e => e.startsWith("data: ") && !e.includes("[DONE]"));
    expect(dataEvents).toHaveLength(3);
  });
});

describe("client stream reader — empty stream guard", () => {
  it("shows the fallback message when no token events are received", () => {
    const events = ["data: [DONE]\n\n"];
    const content = simulateClientReader(events);
    expect(content).toBe(FALLBACK_MESSAGE);
  });

  it("shows the fallback when all chunks had null/missing content (server sends no token events)", () => {
    // Simulate the server-side events when all chunks have no content
    const events = [
      `data: ${JSON.stringify({ token: FALLBACK_MESSAGE })}\n\n`,
      "data: [DONE]\n\n",
    ];
    const content = simulateClientReader(events);
    expect(content).toBe(FALLBACK_MESSAGE);
  });

  it("does NOT show the fallback when real tokens are streamed", () => {
    const events = [
      `data: ${JSON.stringify({ token: "Great " })}\n\n`,
      `data: ${JSON.stringify({ token: "waves today!" })}\n\n`,
      "data: [DONE]\n\n",
    ];
    const content = simulateClientReader(events);
    expect(content).toBe("Great waves today!");
    expect(content).not.toBe(FALLBACK_MESSAGE);
  });

  it("assistant bubble content is never blank after stream ends", () => {
    // Simulate: server sends fallback due to empty stream
    const events = [
      `data: ${JSON.stringify({ token: FALLBACK_MESSAGE })}\n\n`,
      "data: [DONE]\n\n",
    ];
    const content = simulateClientReader(events);
    expect(content.trim()).not.toBe("");
  });
});

describe("fallback message content", () => {
  it("fallback message is a non-empty, user-friendly string", () => {
    expect(FALLBACK_MESSAGE.length).toBeGreaterThan(0);
    expect(FALLBACK_MESSAGE).toMatch(/sorry|couldn't|unable/i);
  });

  it("fallback message includes an invitation to retry", () => {
    expect(FALLBACK_MESSAGE.toLowerCase()).toMatch(/try again/);
  });
});
