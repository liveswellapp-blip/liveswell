import { defineConfig } from "vitest/config";
import path from "path";

const sharedDir = path.resolve(import.meta.dirname, "shared");
const clientSrc = path.resolve(import.meta.dirname, "client", "src");

export default defineConfig({
  // Configure the OXC JSX transform that vitest/vite-8 uses internally.
  // @vitejs/plugin-react targets vite 5 (esbuild); for vitest 4 the internal
  // vite is v8 (Rolldown/OXC) and jsx must be configured via config.oxc instead.
  // @ts-expect-error – oxc is a vite-8 field; the local vite type-stubs are v5
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  resolve: {
    alias: {
      "@shared": sharedDir,
      "@": clientSrc,
    },
  },
  test: {
    // Run server-side unit tests and pure client-side utility tests
    include: [
      "server/**/*.test.ts",
      "client/src/lib/**/*.test.ts",
      "client/src/components/**/*.test.{ts,tsx}",
    ],
    // Most tests run in node; component tests that import React need jsdom.
    // Patterns are matched against the full absolute file path, so use **
    // to anchor from any directory prefix.
    environmentMatchGlobs: [
      ["**/client/src/components/**", "jsdom"],
    ],
    environment: "node",
    // Don't require .env to be present for unit tests
    globals: false,
    // Load RTL matchers for component tests
    setupFiles: ["client/src/test-setup.ts"],
  },
});
