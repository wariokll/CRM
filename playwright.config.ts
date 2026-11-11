import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      slowMo: 150,
      args: [
        "--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND,MAP fonts.gstatic.com ~NOTFOUND",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/start-e2e.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
