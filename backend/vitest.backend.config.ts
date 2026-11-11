import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 30000,
    // Integration suites share this isolated DB; characterization tests clear it between cases.
    fileParallelism: false,
  },
});
