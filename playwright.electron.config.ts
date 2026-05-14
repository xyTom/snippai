import { defineConfig } from "@playwright/test";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.VITE_PUBLIC_POSTHOG_KEY ??= "test-posthog-key";
process.env.VITE_PUBLIC_POSTHOG_HOST ??= "http://127.0.0.1";
process.env.VITE_PORTKEY_API_KEY ??= "test-portkey-key";

export default defineConfig({
  testDir: "./e2e-desktop",
  timeout: 60_000,
  workers: 1,
  outputDir: "test-results/desktop",
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report/desktop", open: "never" }]]
    : [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
