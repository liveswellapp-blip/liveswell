/**
 * ai-summary-helper.ts
 *
 * Isolates the OpenAI surf-summary call so it can be unit-tested independently
 * of the full Express route handler (which has internal self-referential fetches).
 */

import OpenAI from "openai";

/** The model name used for surf summaries — single source of truth. */
export const AI_SUMMARY_MODEL = "gpt-5-mini";

/** Parameters that must be accepted by the model.
 *  Note: gpt-5-mini only supports the default temperature (1) — do not set it. */
export const AI_SUMMARY_PARAMS = {
  max_completion_tokens: 120,
} as const;

export interface SurfSummaryInput {
  locationName: string;
  region: string;
  prompt: string;
}

/**
 * Calls the OpenAI chat completions API and returns the generated surf summary.
 * Throws an error (with the original OpenAI error message) on any API failure —
 * including bad model names, unsupported parameters, or auth errors.
 */
export async function generateSurfSummary(
  client: OpenAI,
  input: SurfSummaryInput
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: AI_SUMMARY_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a veteran surf forecaster who speaks plainly. Write exactly 2 sentences. No bullet points, no markdown, no emojis. Use real surf terminology. Be specific about conditions — never vague.",
      },
      {
        role: "user",
        content: input.prompt,
      },
    ],
    ...AI_SUMMARY_PARAMS,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text || text.trim().length === 0) {
    throw new Error("OpenAI returned an empty response");
  }
  return text;
}
