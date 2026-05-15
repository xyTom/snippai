import { expect, test } from "@playwright/test";
import {
  attachEvidenceScreenshot,
  dropImage,
  launchSnippai,
} from "./helpers";

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
