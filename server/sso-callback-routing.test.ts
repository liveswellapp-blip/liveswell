import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(
  resolve(__dirname, "../client/src/App.tsx"),
  "utf-8",
);

describe("Clerk OAuth callback routing", () => {
  it("mounts the redirect callback handler before the sign-in and sign-up wildcards", () => {
    expect(appSource).toContain('import SsoCallback from "@/pages/SsoCallback";');

    for (const callbackPath of [
      "/sso-callback",
      "/sign-in/sso-callback",
      "/sign-up/sso-callback",
    ]) {
      const callbackRoute = appSource.indexOf(
        `<Route path="${callbackPath}" component={SsoCallback} />`,
      );
      expect(callbackRoute).toBeGreaterThan(-1);

      const authBasePath = callbackPath.includes("/sign-up")
        ? "/sign-up/*?"
        : callbackPath.includes("/sign-in")
          ? "/sign-in/*?"
          : "/sign-in/*?";
      const wildcardRoute = appSource.indexOf(
        `<Route path="${authBasePath}" component={${authBasePath.startsWith("/sign-up") ? "ClerkSignUp" : "ClerkSignIn"}} />`,
      );

      expect(wildcardRoute).toBeGreaterThan(callbackRoute);
    }
  });
});