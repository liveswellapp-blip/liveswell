import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run only server-side unit tests — exclude client and shared code
    include: ["server/**/*.test.ts"],
    environment: "node",
    // Don't require .env to be present for unit tests
    globals: false,
  },
});
