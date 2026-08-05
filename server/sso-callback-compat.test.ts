/**
 * sso-callback-compat.test.ts
 *
 * Guard test: confirms the installed @clerk/clerk-react version is within the
 * range that SsoCallback.tsx was written and tested against.
 *
 * Clerk has a history of renaming props on AuthenticateWithRedirectCallback
 * between major (and occasionally minor) versions, e.g.:
 *
 *   - afterSignInUrl / afterSignUpUrl were introduced in v5
 *   - The `routing` prop requirement changed across v4 → v5
 *
 * SsoCallback.tsx currently passes:
 *   <AuthenticateWithRedirectCallback
 *     afterSignInUrl={redirectUrl}   // read from ?redirect_url= query param, falls back to "/"
 *     afterSignUpUrl={redirectUrl}
 *   />
 *
 * These props are valid for @clerk/clerk-react ^5.x (confirmed against 5.61.9).
 * If the major version changes, /sso-callback MUST be smoke-tested with a real
 * Google/Apple sign-in before the upgrade is merged.
 *
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function installedClerkVersion(): string {
  const pkgPath = resolve(
    __dirname,
    "../node_modules/@clerk/clerk-react/package.json"
  );
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    version: string;
  };
  return pkg.version;
}

function declaredClerkRange(): string {
  const pkgPath = resolve(__dirname, "../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    dependencies: Record<string, string>;
  };
  return pkg.dependencies["@clerk/clerk-react"] ?? "";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("@clerk/clerk-react version compatibility for SsoCallback", () => {
  it("installed major version is 5 — the version SsoCallback props were written against", () => {
    const version = installedClerkVersion();
    const major = parseInt(version.split(".")[0], 10);

    expect(
      major,
      [
        `@clerk/clerk-react ${version} is installed but SsoCallback.tsx was`,
        "written for major version 5 (afterSignInUrl / afterSignUpUrl props).",
        "If upgrading to v6+, smoke-test /sso-callback with a real OAuth",
        "provider before merging. See client/src/pages/SsoCallback.tsx for the",
        "upgrade checklist and update this test once compatibility is confirmed.",
      ].join(" ")
    ).toBe(5);
  });

  it("declared semver range in package.json targets major version 5", () => {
    const range = declaredClerkRange();

    // The range must start with ^5, ~5, or 5 (pinned).
    // A range like ^6.x or ^4.x means the floor version has changed and
    // SsoCallback props should be re-verified.
    expect(
      range,
      [
        `package.json declares "${range}" for @clerk/clerk-react.`,
        "SsoCallback.tsx uses afterSignInUrl/afterSignUpUrl which are v5 props.",
        "Update this test AND smoke-test /sso-callback when bumping major versions.",
      ].join(" ")
    ).toMatch(/^\^?~?5\./);
  });

  it("AuthenticateWithRedirectCallback is exported from @clerk/clerk-react", async () => {
    // Dynamic import so the test gives a clear failure message rather than a
    // module-load error when the export is removed or renamed in a future version.
    const clerkModule = await import("@clerk/clerk-react");

    expect(
      typeof clerkModule.AuthenticateWithRedirectCallback,
      [
        "AuthenticateWithRedirectCallback is no longer exported from",
        "@clerk/clerk-react. SsoCallback.tsx will be broken — update the import",
        "and re-verify the /sso-callback route before deploying.",
      ].join(" ")
    ).toBe("function");
  });
});
