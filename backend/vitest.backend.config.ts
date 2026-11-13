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
        statements: 62.47,
        branches: 38.69,
        functions: 72.72,
        lines: 63.8,
        "src/modules/**": { lines: 63.76 },
      },
    },
  },
});
