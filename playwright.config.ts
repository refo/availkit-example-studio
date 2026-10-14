import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: true,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4178",
    trace: "retain-on-failure",
    channel: "chromium",
    launchOptions: { args: ["--disable-gpu", "--disable-dev-shm-usage"] },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "bun run dev --port 4178 --strictPort",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: false,
    env: {
      VITE_AVAILKIT_BASE_URL: "http://127.0.0.1:9999",
      VITE_AVAILKIT_PUBLISHABLE_KEY: "pk_test_browser_fixture",
    },
  },
});
