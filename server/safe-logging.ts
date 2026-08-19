const SECRET_PATTERNS = [
  /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9_-]+\b/g,
  /\bwhsec_[A-Za-z0-9_-]+\b/g,
  /\b(?:cs|seti|pi)_[A-Za-z0-9_-]+_secret_[A-Za-z0-9_-]+\b/g,
  /([?&](?:client_secret|payment_intent_client_secret)=)[^&\s]+/gi,
  /https:\/\/billing\.stripe\.com\/p\/session\/[^\s"']+/gi,
];

const SENSITIVE_KEYS = /(?:secret|token|password|signature|clientSecret|publishableKey|hostedUrl|pdfUrl|^url$)/i;

export function redactLogText(value: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, (match, prefix) =>
      typeof prefix === "string" && (prefix.startsWith("?") || prefix.startsWith("&"))
        ? `${prefix}[REDACTED]`
        : "[REDACTED]",
    ),
    value,
  );
}

export function sanitizeForLogging(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof value === "string") return redactLogText(value);
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactLogText(value.message),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeForLogging(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, child]) => [
          key,
          SENSITIVE_KEYS.test(key)
            ? "[REDACTED]"
            : sanitizeForLogging(child, depth + 1),
        ]),
    );
  }
  return String(value);
}

function logWith(method: "log" | "info" | "warn" | "error" | "debug", args: unknown[]): void {
  console[method](...args.map((value) => sanitizeForLogging(value)));
}

export const safeLogger = {
  log: (...args: unknown[]) => logWith("log", args),
  info: (...args: unknown[]) => logWith("info", args),
  warn: (...args: unknown[]) => logWith("warn", args),
  error: (...args: unknown[]) => logWith("error", args),
  debug: (...args: unknown[]) => logWith("debug", args),
};