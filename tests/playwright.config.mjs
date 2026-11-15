// Playwright-instellingen voor de Wasroute-rooktest.
// Lokaal zonder Playwright-browser? Zet PW_CHROMIUM=/pad/naar/chromium.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 4280);
const exe = process.env.PW_CHROMIUM;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "rapport" }]] : [["list"], ["html", { open: "never", outputFolder: "rapport" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    launchOptions: exe ? { executablePath: exe, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] } : {},
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "node server/server.mjs",
    url: `http://localhost:${PORT}/__test/blobs`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), APP_PASSWORD: "" },
    timeout: 20_000,
  },
});
