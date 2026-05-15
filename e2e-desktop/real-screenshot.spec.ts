import { expect, test, type TestInfo } from "@playwright/test";
import { type ElectronApplication } from "playwright";
import { execFile } from "node:child_process";
import {
  attachEvidenceScreenshot,
  attachMainProcessWindowScreenshot,
  defaultSettings,
  launchSnippai,
} from "./helpers";

type WindowSnapshot = {
  id: number;
  title: string;
  visible: boolean;
  focused: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  url: string;
};

type Point = {
  x: number;
  y: number;
};

const runRealScreenshotE2E = process.env.RUN_REAL_SCREENSHOT_E2E === "1";

const realScreenshotSettings = {
  ...defaultSettings,
  general: {
    ...defaultSettings.general,
    autoCopyToClipboard: false,
    useSystemScreenshot: false,
  },
};

function runCommand(
  command: string,
  args: string[],
  timeout = 15_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      command,
      args,
      { timeout },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${command} ${args.join(" ")} failed: ${stderr || stdout || error.message}`
            )
          );
          return;
        }

        resolve();
      }
    );

    child.on("error", reject);
  });
}

async function focusMainWindow(
  electronApp: ElectronApplication
): Promise<WindowSnapshot | null> {
  return electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows().find(
      (win) => win.getTitle() !== "screenshots" && !win.isDestroyed()
    );

    if (!mainWindow) {
      return null;
    }

    mainWindow.show();
    mainWindow.focus();
    return {
      id: mainWindow.id,
      title: mainWindow.getTitle(),
      visible: mainWindow.isVisible(),
      focused: mainWindow.isFocused(),
      bounds: mainWindow.getBounds(),
      url: mainWindow.webContents.getURL(),
    };
  });
}

async function getWindowSnapshots(
  electronApp: ElectronApplication
): Promise<WindowSnapshot[]> {
  return electronApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((win) => ({
      id: win.id,
      title: win.getTitle(),
      visible: win.isVisible(),
      focused: win.isFocused(),
      bounds: win.getBounds(),
      url: win.webContents.getURL(),
    }))
  );
}

async function waitForScreenshotOverlay(
  electronApp: ElectronApplication,
  testInfo: TestInfo
): Promise<WindowSnapshot> {
  const deadline = Date.now() + 20_000;
  let snapshots: WindowSnapshot[] = [];

  while (Date.now() < deadline) {
    snapshots = await getWindowSnapshots(electronApp);
    const overlay = snapshots.find(
      (win) => win.title === "screenshots" && win.visible
    );

    if (overlay) {
      await testInfo.attach("overlay-window-state.json", {
        body: JSON.stringify(overlay, null, 2),
        contentType: "application/json",
      });
      return overlay;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for screenshot overlay. Windows: ${JSON.stringify(
      snapshots,
      null,
      2
    )}`
  );
}

function getSelectionPoints(bounds: WindowSnapshot["bounds"]) {
  const start = {
    x: Math.round(bounds.x + Math.max(80, bounds.width * 0.2)),
    y: Math.round(bounds.y + Math.max(80, bounds.height * 0.2)),
  };
  const end = {
    x: Math.round(
      Math.min(bounds.x + bounds.width - 80, start.x + bounds.width * 0.3)
    ),
    y: Math.round(
      Math.min(bounds.y + bounds.height - 80, start.y + bounds.height * 0.25)
    ),
  };
  const center = {
    x: Math.round((start.x + end.x) / 2),
    y: Math.round((start.y + end.y) / 2),
  };
  const confirm = {
    x: Math.round(Math.min(bounds.x + bounds.width - 24, end.x - 20)),
    y: Math.round(Math.min(bounds.y + bounds.height - 24, end.y + 28)),
  };

  return { start, end, center, confirm };
}

async function pressAreaScreenshotShortcut() {
  if (process.platform === "darwin") {
    await runCommand("swift", [
      "-e",
      `
import CoreGraphics
let source = CGEventSource(stateID: .hidSystemState)
let flags: CGEventFlags = [.maskCommand, .maskShift]
let down = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true)!
down.flags = flags
down.post(tap: .cghidEventTap)
let up = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false)!
up.flags = flags
up.post(tap: .cghidEventTap)
      `,
    ]);
    return;
  }

  if (process.platform === "win32") {
    await runCommand("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("^+a")
      `,
    ]);
    return;
  }

  await runCommand("xdotool", ["key", "--clearmodifiers", "ctrl+shift+a"]);
}

async function dragSelectionAndConfirm(start: Point, end: Point, confirm: Point) {
  if (process.platform === "darwin") {
    await runCommand("swift", [
      "-e",
      `
import CoreGraphics
import Foundation

let source = CGEventSource(stateID: .hidSystemState)
func post(_ type: CGEventType, _ x: Double, _ y: Double, _ clickState: Int64 = 0) {
  let event = CGEvent(
    mouseEventSource: source,
    mouseType: type,
    mouseCursorPosition: CGPoint(x: x, y: y),
    mouseButton: .left
  )!
  if clickState > 0 {
    event.setIntegerValueField(.mouseEventClickState, value: clickState)
  }
  event.post(tap: .cghidEventTap)
  usleep(60_000)
}

post(.mouseMoved, ${start.x}, ${start.y})
post(.leftMouseDown, ${start.x}, ${start.y}, 1)
for step in 1...8 {
  let ratio = Double(step) / 8.0
  let x = Double(${start.x}) + (Double(${end.x}) - Double(${start.x})) * ratio
  let y = Double(${start.y}) + (Double(${end.y}) - Double(${start.y})) * ratio
  post(.leftMouseDragged, x, y, 1)
}
post(.leftMouseUp, ${end.x}, ${end.y}, 1)
usleep(250_000)
post(.mouseMoved, ${confirm.x}, ${confirm.y})
post(.leftMouseDown, ${confirm.x}, ${confirm.y}, 1)
post(.leftMouseUp, ${confirm.x}, ${confirm.y}, 1)
      `,
    ]);
    return;
  }

  if (process.platform === "win32") {
    await runCommand("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
"@
function Move-To([int]$x, [int]$y) {
  [NativeMouse]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 60
}
Move-To ${start.x} ${start.y}
[NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
for ($step = 1; $step -le 8; $step++) {
  $ratio = $step / 8
  $x = [Math]::Round(${start.x} + (${end.x} - ${start.x}) * $ratio)
  $y = [Math]::Round(${start.y} + (${end.y} - ${start.y}) * $ratio)
  Move-To $x $y
}
[NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 250
Move-To ${confirm.x} ${confirm.y}
[NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 60
[NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
      `,
    ]);
    return;
  }

  const steps = Array.from({ length: 8 }, (_, index) => {
    const ratio = (index + 1) / 8;
    return [
      "mousemove",
      "--sync",
      String(Math.round(start.x + (end.x - start.x) * ratio)),
      String(Math.round(start.y + (end.y - start.y) * ratio)),
    ];
  }).flat();

  await runCommand("xdotool", [
    "mousemove",
    "--sync",
    String(start.x),
    String(start.y),
    "mousedown",
    "1",
    ...steps,
    "mouseup",
    "1",
    "sleep",
    "0.25",
    "mousemove",
    "--sync",
    String(confirm.x),
    String(confirm.y),
    "click",
    "1",
  ]);
}

test("real area screenshot flow uses global shortcut and mouse drag @real-screenshot", async ({ browserName }, testInfo) => {
  test.skip(
    !runRealScreenshotE2E,
    "Set RUN_REAL_SCREENSHOT_E2E=1 to run OS-level screenshot automation."
  );
  test.setTimeout(90_000);
  testInfo.annotations.push({ type: "browser", description: browserName });

  const { electronApp, page } = await launchSnippai(testInfo, {
    settings: realScreenshotSettings,
  });

  try {
    await page.bringToFront();
    await focusMainWindow(electronApp);
    await attachEvidenceScreenshot(page, testInfo, "01-main-before-shortcut");

    await page.evaluate(async () => {
      const settings = await window.electronAPI?.getAppSettings?.();
      if (!settings || !window.electronAPI?.saveAppSettings) {
        throw new Error("Electron settings API is not available");
      }

      settings.general.useSystemScreenshot = false;
      settings.general.autoCopyToClipboard = false;
      settings.general.autoCopyResult = false;
      settings.shortcuts.screenshot = "CommandOrControl+Shift+A";
      settings.shortcuts.disabledShortcuts = {
        ...settings.shortcuts.disabledShortcuts,
        screenshot: false,
      };

      const saved = await window.electronAPI.saveAppSettings(settings);
      if (!saved) {
        throw new Error("Failed to save screenshot E2E settings");
      }
    });

    await focusMainWindow(electronApp);
    await pressAreaScreenshotShortcut();

    const overlay = await waitForScreenshotOverlay(electronApp, testInfo);
    await attachMainProcessWindowScreenshot(
      electronApp,
      testInfo,
      overlay.id,
      "02-overlay-before-drag"
    );

    const { start, end, center, confirm } = getSelectionPoints(overlay.bounds);
    await testInfo.attach("selection-points.json", {
      body: JSON.stringify({ start, end, center, confirm }, null, 2),
      contentType: "application/json",
    });
    await dragSelectionAndConfirm(start, end, confirm);

    await page.bringToFront();
    await expect(page.getByTestId("screenshot-preview")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("result-textarea")).toHaveValue(
      "Recognized text from desktop E2E",
      { timeout: 20_000 }
    );
    await attachEvidenceScreenshot(page, testInfo, "03-analysis-after-real-drag");
  } finally {
    await electronApp.close();
  }
});
