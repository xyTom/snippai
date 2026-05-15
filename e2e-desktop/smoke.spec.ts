import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  _electron as electron,
  type ElectronApplication,
} from "playwright";
import electronPath from "electron";
import path from "node:path";

const appRoot = path.resolve(__dirname, "..");
const png1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const autoResponse = {
  primaryAction: "Text",
  candidates: [
    {
      rank: 1,
      action: "Text",
      confidence: 0.95,
      reason: "Text is visible",
      result: "Recognized text from desktop E2E",
    },
  ],
};

const shouldAttachEvidence = process.env.PLAYWRIGHT_RECORD_ARTIFACTS === "1";

async function attachEvidenceScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string
) {
  if (!shouldAttachEvidence) {
    return;
  }

  await testInfo.attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function mockNetwork(electronApp: ElectronApplication) {
  const context = electronApp.context();
  await context.route("https://api.portkey.ai/v1/chat/completions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify(autoResponse) } }],
      }),
    })
  );
  await context.route("https://example.supabase.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null, error: null }),
    })
  );
  await context.route("https://*.ingest.*/*", (route) => route.abort());
}

async function waitForAppShell(electronApp: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    for (const page of electronApp.windows()) {
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 2_000 });
        await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 2_000 });
        return page;
      } catch (error) {
        lastError = error;
      }
    }
    await electronApp.waitForEvent("window", { timeout: 500 }).catch((): null => null);
  }

  throw new Error(
    `Timed out waiting for app shell: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function launchSnippai(testInfo: TestInfo) {
  const userDataDir = testInfo.outputPath("user-data");
  const electronApp = await electron.launch({
    executablePath: electronPath as unknown as string,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      appRoot,
    ],
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      VITE_PUBLIC_POSTHOG_KEY: "",
      VITE_PUBLIC_POSTHOG_HOST: "",
      VITE_PORTKEY_API_KEY: "test-portkey-key",
    },
  });

  await mockNetwork(electronApp);
  const page = await waitForAppShell(electronApp);
  return { electronApp, page };
}

async function dropImage(page: Page) {
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const file = new File([bytes], "desktop-e2e.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer;
  }, png1x1);

  await page.dispatchEvent("body", "drop", { dataTransfer });
}

test("desktop app opens settings, analyzes an image, pins a result, and hides on close", async ({ browserName }, testInfo) => {
  testInfo.annotations.push({ type: "browser", description: browserName });
  const { electronApp, page } = await launchSnippai(testInfo);

  try {
    await attachEvidenceScreenshot(page, testInfo, "01-main-window");

    await page.getByTestId("settings-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("settings-general-tab")).toBeVisible();
    await attachEvidenceScreenshot(page, testInfo, "02-settings-dialog");
    await page.keyboard.press("Escape");

    await dropImage(page);
    await expect(page.getByTestId("result-textarea")).toHaveValue(
      "Recognized text from desktop E2E"
    );
    await attachEvidenceScreenshot(page, testInfo, "03-analysis-result");

    const stickyWindowPromise = electronApp.waitForEvent("window");
    await page.getByTestId("pin-button").click();
    const stickyWindow = await stickyWindowPromise;
    await stickyWindow.waitForLoadState("domcontentloaded");
    await expect(stickyWindow.getByTestId("app-shell")).toBeVisible();
    await expect(stickyWindow.getByTestId("result-textarea")).toHaveValue(
      "Recognized text from desktop E2E"
    );
    await attachEvidenceScreenshot(stickyWindow, testInfo, "04-sticky-window");

    const closeState = await electronApp.evaluate(({ BrowserWindow }) => {
      const mainWindow = BrowserWindow.getAllWindows().find(
        (candidate) => !candidate.webContents.getURL().includes("isSticky=true")
      );
      mainWindow?.close();
      return {
        exists: Boolean(mainWindow && !mainWindow.isDestroyed()),
        visible: mainWindow?.isVisible() ?? false,
      };
    });

    expect(closeState).toEqual({ exists: true, visible: false });
  } finally {
    await electronApp.close();
  }
});
