import { defineConfig, devices } from "@playwright/test"

const isCI = Boolean(process.env.CI)
const baseURL = "http://localhost:4173"

// End-to-end tests run against the production build served by `vite preview`, so the service
// worker and precache behave as they do for users. Paths resolve relative to this file.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [["list"], ["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `&&` works in both the POSIX shell and cmd.exe that npm uses on Windows.
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: baseURL,
    // Locally an already running preview is reused; it serves whatever build it was started with.
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
