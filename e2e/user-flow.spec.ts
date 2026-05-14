import { expect, Page, test } from "@playwright/test";
import type { AppSettings } from "../src/renderer/types/settings";

type MockElectronWindow = Window & {
  electronAPI: Partial<SnippaiElectronAPI>;
};

const png1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const autoResponse = {
  primaryAction: "Text",
  candidates: [
    {
      rank: 1,
      action: "Text",
      confidence: 0.94,
      reason: "Text is visible",
      result: "Recognized text from E2E",
    },
    {
      rank: 2,
      action: "Code",
      confidence: 0.72,
      reason: "Code-like content is visible",
      result: "console.log('hello from e2e')",
    },
  ],
};

const icsResult = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Snippai//E2E//EN
BEGIN:VEVENT
UID:e2e-calendar-event
DTSTART:20260514T100000Z
DTEND:20260514T110000Z
SUMMARY:Snippai E2E Review
END:VEVENT
END:VCALENDAR`;

async function installElectronApiMock(page: Page) {
  await page.addInitScript(() => {
    const defaultSettings: AppSettings = {
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

    (window as MockElectronWindow).electronAPI = {
      platform: "linux",
      getAppSettings: async () => defaultSettings,
      saveAppSettings: async () => true,
      getAppVersion: async () => "0.2.0",
      readClipboardText: async () => "Meeting at 10 AM tomorrow",
      writeClipboardText: async () => true,
      pinToScreen: async () => true,
      exportExcelTables: async () => ({ success: true, fileName: "tables.xlsx" }),
      onScreenShotRes: (): void => undefined,
      onStickyNoteData: (): void => undefined,
      onPinCurrentScreenshot: (): void => undefined,
      onAuthCallback: (): void => undefined,
      removeListener: (): void => undefined,
      removeAllListeners: (): void => undefined,
      sendMessage: (): void => undefined,
    };
  });
}

async function mockNetwork(page: Page) {
  await page.route("https://api.portkey.ai/v1/chat/completions", async (route) => {
    const body = route.request().postDataJSON();
    const content = body.messages?.[0]?.content;
    const promptText = Array.isArray(content)
      ? content.find((part: { type: string; text?: string }) => part.type === "text")?.text ?? ""
      : String(content ?? "");

    const responseText = promptText.includes("Only return the ICS data")
      ? icsResult
      : promptText.startsWith("Return only the LaTeX")
        ? "x^2"
        : JSON.stringify(autoResponse);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: responseText } }],
      }),
    });
  });

  await page.route("https://example.supabase.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null, error: null }),
    })
  );
  await page.route("https://*.ingest.*/*", (route) => route.abort());
}

async function dropImage(page: Page) {
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const file = new File([bytes], "snippai-e2e.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer;
  }, png1x1);

  await page.dispatchEvent("body", "drop", { dataTransfer });
}

test.beforeEach(async ({ page }) => {
  await installElectronApiMock(page);
  await mockNetwork(page);
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible();
});

test("normal image analysis flow supports Auto candidates and rerun", async ({ page }) => {
  await expect(page.getByTestId("empty-state-logo")).toBeVisible();

  await dropImage(page);
  await expect(page.getByTestId("screenshot-preview")).toBeVisible();
  await expect(page.getByTestId("result-textarea")).toHaveValue("Recognized text from E2E");

  await page.getByTestId("auto-action-code").click();
  await expect(page.getByTestId("result-textarea")).toHaveValue("console.log('hello from e2e')");

  await page.getByTestId("auto-action-formula").click();
  await expect(page.getByTestId("result-textarea")).toHaveValue("x^2");

  await expect(page.getByTestId("auto-candidate-tabs")).toBeVisible();
  await page.getByTestId("auto-action-text").click();
  await expect(page.getByTestId("result-textarea")).toHaveValue("Recognized text from E2E");
});

test("settings and calendar export path are reachable", async ({ page }) => {
  await page.getByTestId("settings-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("settings-general-tab")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Calendar" }).click();
  await dropImage(page);
  await expect(page.getByTestId("result-textarea")).toHaveValue(icsResult);
  await expect(page.getByRole("button", { name: /save \.ics/i })).toBeVisible();
});
