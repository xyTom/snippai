import { defineConfig } from "@playwright/test";

const port = 4173;
const recordArtifacts = process.env.PLAYWRIGHT_RECORD_ARTIFACTS === "1";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.VITE_PUBLIC_POSTHOG_KEY ??= "test-posthog-key";
process.env.VITE_PUBLIC_POSTHOG_HOST ??= "http://127.0.0.1";
process.env.VITE_PORTKEY_API_KEY ??= "test-portkey-key";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  workers: 1,
  outputDir: "test-results/web",
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report/web", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: recordArtifacts ? "on" : "retain-on-failure",
    screenshot: recordArtifacts ? "on" : "only-on-failure",
    video: recordArtifacts ? "on" : "retain-on-failure",
  },
  webServer: {
    command: `npm run start:web -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
