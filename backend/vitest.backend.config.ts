import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 30000,
    // Integration suites share this isolated DB; characterization tests clear it between cases.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "../coverage/backend",
      thresholds: {
        statements: 82.62,
        branches: 62.78,
        functions: 84.1,
        lines: 84.45,
        "src/modules/**": { lines: 85.85 },
      },
    },
  },
});
