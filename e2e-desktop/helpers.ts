import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  _electron as electron,
  type ElectronApplication,
} from "playwright";
import electronPath from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AppSettings } from "../src/renderer/types/settings";

export const appRoot = path.resolve(__dirname, "..");

export const png1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const autoResponse = {
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

export const shouldAttachEvidence =
  process.env.PLAYWRIGHT_RECORD_ARTIFACTS === "1";

export const defaultSettings: AppSettings = {
  shortcuts: {
    screenshot: "CommandOrControl+Shift+A",
    fullscreenScreenshot: "CommandOrControl+Shift+F",
    hideAllStickyNotes: "CommandOrControl+Shift+H",
    pinToScreen: "CommandOrControl+Shift+P",
    disabledShortcuts: {},
  },
  general: {
    autoCopyToClipboard: true,
    autoCopyResult: false,
    autoStart: false,
    horizontalLayout: false,
    uiLanguage: "default",
    hiddenFromScreenCapture: false,
    useSystemScreenshot: true,
  },
  llmProviders: [],
};

type LaunchOptions = {
  settings?: AppSettings;
};

export async function attachEvidenceScreenshot(
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

export async function attachMainProcessWindowScreenshot(
  electronApp: ElectronApplication,
  testInfo: TestInfo,
  windowId: number,
  name: string
) {
  if (!shouldAttachEvidence) {
    return;
  }

  const base64 = await electronApp.evaluate(async ({ BrowserWindow }, id) => {
    const win = BrowserWindow.fromId(id);
    if (!win || win.isDestroyed()) {
      return null;
    }

    const image = await win.capturePage();
    return image.toPNG().toString("base64");
  }, windowId);

  if (!base64) {
    return;
  }

  await testInfo.attach(`${name}.png`, {
    body: Buffer.from(base64, "base64"),
    contentType: "image/png",
  });
}

export async function mockNetwork(electronApp: ElectronApplication) {
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

export async function waitForAppShell(
  electronApp: ElectronApplication
): Promise<Page> {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    for (const page of electronApp.windows()) {
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 2_000 });
        await expect(page.getByTestId("app-shell")).toBeVisible({
          timeout: 2_000,
        });
        return page;
      } catch (error) {
        lastError = error;
      }
    }
    await electronApp
      .waitForEvent("window", { timeout: 500 })
      .catch((): null => null);
  }

  throw new Error(
    `Timed out waiting for app shell: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function launchSnippai(
  testInfo: TestInfo,
  options: LaunchOptions = {}
) {
  const userDataDir = testInfo.outputPath("user-data");

  if (options.settings) {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(
      path.join(userDataDir, "app-settings.json"),
      JSON.stringify(options.settings, null, 2)
    );
  }

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

export async function dropImage(page: Page) {
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const file = new File([bytes], "desktop-e2e.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer;
  }, png1x1);

  await page.dispatchEvent("body", "drop", { dataTransfer });
}
