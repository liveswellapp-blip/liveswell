import { defineConfig } from "vitest/config";
import path from "path";

const sharedDir = path.resolve(import.meta.dirname, "shared");

export default defineConfig({
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  test: {
    // Run server-side unit tests and pure client-side utility tests
    include: ["server/**/*.test.ts", "client/src/lib/**/*.test.ts"],
    environment: "node",
    // Don't require .env to be present for unit tests
    globals: false,
  },
});
