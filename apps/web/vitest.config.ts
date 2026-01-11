import { defineConfig } from "vitest/config";
import path from "path";
import { loadEnvFile } from "node:process";

// Load test environment variables
try {
  loadEnvFile(".env.test.local");
} catch {
  // File doesn't exist, will be caught by setup.ts
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    testTimeout: 120000, // 2 minutes for E2E tests
    hookTimeout: 30000,
    include: ["__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".next"],
  },
});
