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
    // Run only server-side unit tests — exclude client and shared code
    include: ["server/**/*.test.ts"],
    environment: "node",
    // Don't require .env to be present for unit tests
    globals: false,
  },
});
