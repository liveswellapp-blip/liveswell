import { describe, expect, it } from "vitest";
import { redactLogText, sanitizeForLogging } from "./safe-logging";

describe("billing log redaction", () => {
  it("redacts Stripe credentials, webhook secrets, and client secrets from strings", () => {
    const input = [
      "sk_live_example123",
      "whsec_example123",
      "cs_example_secret_value",
      "https://example.test/callback?client_secret=seti_example_secret_value",
    ].join(" ");
    const output = redactLogText(input);
    expect(output).not.toContain("sk_live_example123");
    expect(output).not.toContain("whsec_example123");
    expect(output).not.toContain("secret_value");
  });

  it("redacts sensitive response fields before API logging and monitoring", () => {
    expect(sanitizeForLogging({
      clientSecret: "cs_example_secret_value",
      publishableKey: "pk_live_example",
      url: "https://billing.stripe.com/p/session/example",
      nested: { subscriptionId: "sub_safe" },
    })).toEqual({
      clientSecret: "[REDACTED]",
      publishableKey: "[REDACTED]",
      url: "[REDACTED]",
      nested: { subscriptionId: "sub_safe" },
    });
  });
});