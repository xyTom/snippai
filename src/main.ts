import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  dialog,
  contextBridge,
  clipboard,
} from "electron";
import path from "path";
import { exec, execFile } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import os from "os";
import { DEFAULT_SHORTCUTS, getShortcutLabel } from "./shared/shortcuts";
import * as Sentry from "@sentry/electron/main";
import { logger, LogLevel, createLogger } from "./utils/logger";

// Initialize Sentry for error tracking
Sentry.init({
  dsn: "https://b07962090a9e8e5aaf2a34a0b8721a9e@o4507063511089152.ingest.us.sentry.io/4507128527781888",
});

const Screenshots = require("electron-screenshots");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Global reference to the main window to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let screenshots: any = null;
// 保存所有便签窗口的引用
let stickyNotes: BrowserWindow[] = [];

/**
 * Creates and configures the main application window
 * @returns {BrowserWindow} The configured browser window instance
 */
function createMainWindow(): BrowserWindow {
  console.log("Creating main window");

  // Configure the browser window
  const window = new BrowserWindow({
    width: 830,
    height: 600,
    minWidth: 600,
    minHeight: 300,
    backgroundColor: "#000000",
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
    titleBarStyle: "default",
    trafficLightPosition: { x: 10, y: 10 },
    vibrancy: "under-window",
    visualEffectState: "active",
  });

  // Show window when ready
  window.once("ready-to-show", () => {
    console.log("Window ready to show");
    window.show();
    window.focus();
  });

  // Set zoom factor when DOM is ready
  window.webContents.on("dom-ready", () => {
    console.log("DOM ready");
    window.webContents.setZoomFactor(1);
  });

  // Handle window close event
  window.on("close", () => {
    console.log("Main window closed");
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // Load the application content
  loadApplicationContent(window);

  return window;
}

/**
 * Loads the appropriate content into the window based on environment
 * @param {BrowserWindow} window - The window to load content into
 */
function loadApplicationContent(window: BrowserWindow): void {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log(
      "Loading from dev server URL:",
      MAIN_WINDOW_VITE_DEV_SERVER_URL
    );
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open DevTools in development mode
    window.webContents.openDevTools();
  } else {
    const filePath = path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
    );
    console.log("Loading from file path:", filePath);
    window.loadFile(filePath).catch((err) => {
      console.error("Failed to load file:", err);
    });
  }
}

/**
 * Shows the main window, restoring it if minimized
 */
function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("Main window is not available, creating new window");
    mainWindow = createMainWindow();
    return;
  }

  console.log("Making existing window visible");
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

const captureWithNativeMac = async (): Promise<string | null> => {
  const tmpPath = `${os.tmpdir()}/snippai_capture_${Date.now()}.png`;

  return new Promise((resolve, reject) => {
    const args = ["-i", "-x", tmpPath];

    execFile("screencapture", args, (err) => {
      if (err) {
        console.warn("Screencapture canceled or failed:", err);
        return resolve(null); // User canceled
      }

      try {
        const buffer = readFileSync(tmpPath);
        const base64 = buffer.toString("base64");
        unlinkSync(tmpPath); // clean up
        resolve(`data:image/png;base64,${base64}`);
      } catch (readErr) {
        console.error("Failed to read screencapture output:", readErr);
        resolve(null);
      }
    });
  });
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const captureWithNativeWindows = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    exec('start "" "ms-screenclip:?clippingMode=Rectangle"', async (error) => {
      if (error) {
        console.warn("Failed to launch ms-screenclip:", error);
        return resolve(null);
      }

      const timeout = Date.now() + 5000;

      const pollClipboard = async (): Promise<void> => {
        const img = clipboard.readImage();
        if (!img.isEmpty()) {
          const base64 = img.toDataURL().split(",")[1];
          return resolve(base64);
        }

        if (Date.now() > timeout) {
          return resolve(null);
        }

        await delay(300);
        await pollClipboard();
      };

      await pollClipboard();
    });
  });
};

/**
 * Sets up screenshot functionality
 */
function setupScreenshots(): void {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  console.log("Primary Display Scale Factor:", scaleFactor);

  // Create a dedicated logger for screenshots module
  const screenshotsLogger = createLogger({
    namespace: "snippai:screenshots",
    level: LogLevel.DEBUG,
    consoleOutput: true,
  });

  // Initialize screenshot module with options
  screenshots = new Screenshots({
    singleWindow: true,
    // lang: lang,
    logger: screenshotsLogger.createLoggerFn(),
  });

  // Set zoom factor when capture starts
  screenshots.on("capture-start", () => {
    if (screenshots.$win) {
      screenshots.$win.webContents.setZoomFactor(1);
    }
  });

  // Register global shortcut for taking screenshots
  registerScreenshotShortcuts();

  // Configure screenshot event handlers
  setupScreenshotEventHandlers(scaleFactor);
}

/**
 * Registers keyboard shortcuts for screenshot functionality
 */
function registerScreenshotShortcuts(): void {
  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();

  // Get the shortcut from settings with fallback to default
  const shortcutKey = getSettingValue(
    "shortcuts.screenshot",
    DEFAULT_SHORTCUTS.screenshot
  );
  const fullscreenShortcutKey = getSettingValue(
    "shortcuts.fullscreenScreenshot",
    DEFAULT_SHORTCUTS.fullscreenScreenshot
  );

  console.log("Registering screenshot shortcut:", shortcutKey);
  // Register screenshot and check result
  const registeredScreenshot = globalShortcut.register(shortcutKey, () => {
    // Skip if screenshot window is already focused
    if (screenshots.$win?.isFocused()) {
      return;
    }

    let screenshotDelay = 0;
    if (!mainWindow?.isDestroyed()) {
      if (!mainWindow.isMinimized()) {
        screenshotDelay = 500;
      }
      mainWindow.minimize();
    }
    setTimeout(async () => {
      const isMac = process.platform === "darwin";
      const isWindows = process.platform === "win32";
      const useNative = getSettingValue("general.useSystemScreenshot", true);

      let base64: string | null = null;
      
      if (useNative) {
        if (isMac) {
          base64 = await captureWithNativeMac();
        } else if (isWindows) {
          base64 = await captureWithNativeWindows();
        }
      }

      if (base64 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("screenshot-result", base64);
        showMainWindow();
      } else {
        console.log("Fall back to electron-screenshots");
        screenshots.startCapture();
      }
    }, screenshotDelay);
  });
  if (!registeredScreenshot) {
    console.error(`Failed to register screenshot shortcut: ${shortcutKey}`);
    dialog.showErrorBox(
      "Shortcut Registration Failed",
      `Cannot register ${getShortcutLabel(
        "screenshot"
      )} shortcut (${shortcutKey}). It may be in use by another application.`
    );
  }

  // 全屏截图快捷键注册
  console.log(
    "Registering fullscreen screenshot shortcut:",
    fullscreenShortcutKey
  );
  const registeredFullscreen = globalShortcut.register(
    fullscreenShortcutKey,
    async () => {
      try {
        // 最小化主窗口以避免它出现在截图中
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          !mainWindow.isMinimized()
        ) {
          mainWindow.minimize();
        }

        // 短暂延迟确保窗口最小化完成
        await new Promise((resolve) => setTimeout(resolve, 100));

        const { desktopCapturer, nativeImage } = require("electron");

        // 使用 desktopCapturer 获取全屏截图
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: 1920, height: 1080 },
          fetchWindowIcons: false,
        });

        if (sources.length > 0) {
          // 获取主屏幕的源
          const primarySource = sources[0]; // 通常第一个是主屏幕
          console.log("screen source:", sources);

          // 获取完整尺寸的截图
          const image = primarySource.thumbnail;

          // 转换为 base64 - 使用 toDataURL 方法
          const pngBuffer = await image.toPNG();
          // 转换为 base64
          const base64 = Buffer.from(pngBuffer).toString("base64");
          console.log("Base64 image:", base64);

          // 发送截图结果到主窗口
          mainWindow.webContents.send("screenshot-result", base64);
        } else {
          console.error("No screen sources found");
        }
      } catch (err) {
        console.error("Failed to capture fullscreen screenshot:", err);
      }
    }
  );
  if (!registeredFullscreen) {
    console.error(
      `Failed to register fullscreen screenshot shortcut: ${fullscreenShortcutKey}`
    );
    dialog.showErrorBox(
      "Shortcut Registration Failed",
      `Cannot register ${getShortcutLabel(
        "fullscreenScreenshot"
      )} shortcut (${fullscreenShortcutKey}). It may be in use by another application.`
    );
  }
}

/**
 * Sets up event handlers for screenshot operations
 * @param {number} scaleFactor - The display scale factor
 */
function setupScreenshotEventHandlers(scaleFactor: number): void {
  // Create a dedicated logger for screenshot event handlers
  const eventLogger = createLogger({
    namespace: "snippai:screenshots:events",
    level: LogLevel.DEBUG,
    consoleOutput: true,
  });

  // Save previously active application information
  let previouslyFocusedApp: string | null = null;

  // Handle successful screenshot capture
  screenshots.on("ok", (e: any, buffer: Uint8Array, bounds: any) => {
    const base64 = Buffer.from(buffer).toString("base64");
    eventLogger.info("Screenshot captured successfully");
    eventLogger.debug("Base64 image captured with scale factor:", scaleFactor);

    // Check app settings for auto-copy preference
    const isAutoCopyDisabled =
      getSettingValue("general.autoCopyToClipboard") === false;

    // Handle auto-copy based on settings
    if (isAutoCopyDisabled) {
      // Prevent default behavior (copying to clipboard)
      e.preventDefault();
      eventLogger.info("Auto copy to clipboard is disabled");

      // Manually end capture since we prevented the default behavior
      screenshots.endCapture();
    } else {
      // Use library's default implementation (copies to clipboard and ends capture)
      eventLogger.info("Auto copy to clipboard is enabled");
    }

    // Send screenshot data to renderer process
    if (!mainWindow?.isDestroyed()) {
      mainWindow.webContents.send("screenshot-result", base64);
      eventLogger.info("Screenshot sent to main window");
      showMainWindow();
    } else {
      eventLogger.warn("Main window is not available, creating new window");
      mainWindow = createMainWindow();
      //wait for window to be ready
      mainWindow.once("ready-to-show", () => {
        mainWindow.webContents.send("screenshot-result", base64);
        eventLogger.info("Screenshot sent to new main window");
      });
    }
  });

  // Handle screenshot cancellation
  screenshots.on("cancel", () => {
    eventLogger.info("Screenshot capture cancelled");
    showMainWindow();

    // Restore focus to previously active application
    restorePreviousFocus(previouslyFocusedApp);
  });

  // Handle screenshot save
  screenshots.on("save", (e: any, buffer: Uint8Array, bounds: any) => {
    eventLogger.info("Screenshot saved");
    eventLogger.debug("Screenshot bounds:", bounds);
  });

  // Handle after-save event
  screenshots.on(
    "afterSave",
    (e: any, buffer: Uint8Array, bounds: any, isSaved: any) => {
      eventLogger.info("Screenshot afterSave event");
      eventLogger.debug("Save status:", isSaved);
    }
  );

  screenshots.on("windowCreated", ($win: Electron.BrowserWindow) => {
    $win.on("focus", () => {
      if (process.platform === "darwin") {
        try {
          // 记录当前活跃的应用程序，以便稍后恢复
          const { execSync } = require("child_process");
          previouslyFocusedApp = execSync(
            'osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"'
          )
            .toString()
            .trim();
          eventLogger.debug("Previously focused app:", previouslyFocusedApp);
        } catch (error) {
          eventLogger.error("Failed to get frontmost app:", error);
          previouslyFocusedApp = null;
        }
        app.focus({ steal: true });
      }
      globalShortcut.register("esc", () => {
        if ($win?.isFocused()) {
          screenshots.endCapture();
        }
        restorePreviousFocus(previouslyFocusedApp);
      });
    });

    $win.on("blur", () => {
      globalShortcut.unregister("esc");
    });
  });
}

/**
 * Attempt to restore focus to the previously active application
 * @param {string | null} appName - Name of the previously active application
 */
function restorePreviousFocus(appName: string | null): void {
  if (!appName || process.platform !== "darwin") return;

  setTimeout(() => {
    try {
      const { exec } = require("child_process");

      exec(
        `osascript -e 'tell application "${appName}" to activate'`,
        (error: any) => {
          if (error) {
            logger.error("Failed to restore focus:", error);
          } else {
            logger.info("Focus restored to:", appName);
          }
        }
      );
    } catch (error) {
      logger.error("Error restoring focus:", error);
    }
  }, 10);
}

/**
 * Creates a sticky note window with the screenshot and result
 * @param {string} screenshot - Base64 encoded screenshot
 * @param {string} result - Analysis result
 * @returns {BrowserWindow} The sticky note window
 */
function createStickyNoteWindow(
  screenshot: string,
  result: string | null
): BrowserWindow {
  // Check layout settings
  const isHorizontalLayout = getSettingValue("general.horizontalLayout", false);

  // Create a new floating window
  const stickyNote = new BrowserWindow({
    width: isHorizontalLayout ? 700 : 400,
    height: isHorizontalLayout ? 400 : 500,
    minWidth: isHorizontalLayout ? 600 : 300,
    frame: false, // Frameless window
    backgroundColor: "#000000",
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
    skipTaskbar: true, // Don't show in taskbar
    titleBarStyle: "hidden", // Hide title bar
    transparent: true, // Transparent background
  });

  // Load main interface and pass isSticky parameter (without large data like screenshot and result)
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Development mode: add query parameter
    stickyNote.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?isSticky=true`);
  } else {
    // Production mode: use hash parameter
    const filePath = path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
    );
    stickyNote
      .loadFile(filePath, {
        hash: `isSticky=true`,
      })
      .catch((err) => {
        logger.error("Failed to load sticky note file:", err);
      });
  }

  // Wait for the window to be ready, then send screenshot and result data via IPC
  stickyNote.webContents.on("did-finish-load", () => {
    stickyNote.webContents.send("sticky-note-data", {
      screenshot,
      result: result || "",
    });
  });

  // Add window close event
  stickyNote.on("closed", () => {
    // Remove window reference from array
    stickyNotes = stickyNotes.filter((note) => note !== stickyNote);
    logger.debug("Sticky note closed, remaining notes:", stickyNotes.length);
  });

  // Save window reference
  logger.debug("Created new sticky note window");
  stickyNotes.push(stickyNote);

  if (process.platform === "darwin") {
    stickyNote.setWindowButtonVisibility(false);
  }

  return stickyNote;
}

/**
 * Handles application initialization and lifecycle
 */
function initializeApp(): void {
  console.log("App ready (whenReady)");

  // Create window if needed
  if (!mainWindow || BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }

  // Set up global error handler
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    Sentry.captureException(error);
  });

  // Configure high DPI support
  app.commandLine.appendSwitch("high-dpi-support", "1");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");

  // Log application info
  console.log("App is packaged:", app.isPackaged);
  console.log("App path:", app.getAppPath());

  // Set up screenshot functionality
  setupScreenshots();

  // 设置IPC处理程序
  setupIpcHandlers();
}

/**
 * Sets up application lifecycle event handlers
 */
function setupAppEventHandlers(): void {
  // Handle second instance launch
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    console.log("Second instance detected, focusing first instance");
    showMainWindow();
  });

  // Application ready event
  app.on("ready", () => {
    console.log("App ready event fired");
    mainWindow = createMainWindow();
  });

  // Window closed event
  app.on("window-all-closed", () => {
    console.log("All windows closed");
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // App activation event (macOS)
  app.on("activate", () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    console.log(
      "App activated, window count:",
      BrowserWindow.getAllWindows().length
    );
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("Creating new window on activate");
      mainWindow = createMainWindow();
    } else {
      showMainWindow();
    }
  });
}

/**
 * Gets a setting value from the app settings file
 * @param {string} path - The dot-notation path to the setting (e.g., 'general.autoCopyToClipboard')
 * @param {any} defaultValue - The default value to return if the setting is not found
 * @returns {any} The setting value or the default value
 */
function getSettingValue(path: string, defaultValue: any = null): any {
  try {
    const fs = require("fs");
    const pathModule = require("path");
    const settingsPath = pathModule.join(
      app.getPath("userData"),
      "app-settings.json"
    );

    if (!fs.existsSync(settingsPath)) {
      return defaultValue;
    }

    const data = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(data);

    // Handle dot notation path (e.g., 'general.autoCopyToClipboard')
    const parts = path.split(".");
    let current = settings;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue;
      }
      current = current[part];
    }

    return current !== undefined ? current : defaultValue;
  } catch (error) {
    console.error(`Error getting setting value for ${path}:`, error);
    return defaultValue;
  }
}

/**
 * 设置应用程序自启动
 * @param {boolean} enable - 是否启用自启动
 * @returns {boolean} 操作是否成功
 */
function setAutoStart(enable: boolean): boolean {
  // 开发环境下不实际设置自启动，但返回成功以便于测试
  if (!app.isPackaged) {
    console.log(
      `[DEV] Auto-start would be ${
        enable ? "enabled" : "disabled"
      } in packaged app`
    );
    return true;
  }

  try {
    // 获取当前自启动状态
    const currentState = app.getLoginItemSettings();

    // 如果当前状态与目标状态相同，无需更改
    if (currentState.openAtLogin === enable) {
      return true;
    }

    // 设置自启动
    app.setLoginItemSettings({
      openAtLogin: enable,
    });

    console.log(`Auto-start ${enable ? "enabled" : "disabled"} successfully`);
    return true;
  } catch (error) {
    console.error("Error setting auto-start:", error);
    return false;
  }
}

/**
 * 获取应用程序自启动状态
 * @returns {boolean} 是否启用了自启动
 */
function getAutoStartStatus(): boolean {
  // 开发环境下始终返回关闭状态
  if (!app.isPackaged) {
    return false;
  }

  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (error) {
    console.error("Error getting auto-start status:", error);
    return false;
  }
}

/**
 * 设置所有IPC处理程序
 */
function setupIpcHandlers(): void {
  // 处理pinToScreen请求
  ipcMain.handle("pin-to-screen", (_event, data) => {
    console.log("Pin to screen requested", data);
    const { screenshot, result } = data;
    createStickyNoteWindow(screenshot, result);
    return true;
  });

  // 处理便签窗口的置顶切换
  ipcMain.handle("toggle-sticky-note-pin", (_event, { isPinned }) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      win.setAlwaysOnTop(isPinned);
    }
    return true;
  });

  // 处理便签窗口的大小调整
  ipcMain.handle("resize-sticky-note", (_event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      // 检查布局设置
      const isHorizontalLayout = getSettingValue(
        "general.horizontalLayout",
        false
      );

      // 根据布局设置调整大小
      if (isHorizontalLayout) {
        // 水平布局时保持更宽的尺寸
        const adjustedWidth = Math.max(width, 600);
        win.setSize(adjustedWidth, height);
      } else {
        win.setSize(width, height);
      }
    }
    return true;
  });

  // 处理便签窗口的拖动
  ipcMain.handle("drag-sticky-note", (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      // 不能直接使用startDrag方法，因为BrowserWindow没有此方法
      // 对于无边框窗口，Electron提供了-webkit-app-region CSS属性来实现拖动
      // 已经在HTML/CSS中通过-webkit-app-region: drag实现了拖动功能
      // 这里只是一个空操作，实际的拖动行为由浏览器处理
    }
    return true;
  });

  // 处理打开开发者工具的请求
  ipcMain.handle("open-dev-tools", (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      win.webContents.openDevTools({ mode: "detach" });
    }
    return true;
  });

  /**
   * Get application settings from storage or create default settings if not found
   * Implements robust error handling and auto-recovery for corrupted config files
   */
  ipcMain.handle("get-app-settings", () => {
    // Define standard default settings object
    const createDefaultSettings = () => ({
      shortcuts: {
        screenshot: "CommandOrControl+Shift+A",
        fullscreenScreenshot: "CommandOrControl+Shift+F",
      },
      general: {
        autoCopyToClipboard: true,
        autoStart: getAutoStartStatus(), // Always use actual system state
        uiLanguage: "default",
        horizontalLayout: false,
      },
    });

    try {
      const fs = require("fs");
      const path = require("path");
      const userDataPath = app.getPath("userData");
      const settingsPath = path.join(userDataPath, "app-settings.json");

      // Create settings directory if it doesn't exist
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }

      // Get default settings with current system state
      const defaultSettings = createDefaultSettings();

      // If settings file does not exist, create it with defaults
      if (!fs.existsSync(settingsPath)) {
        logger.info("Settings file not found, creating default settings");
        try {
          fs.writeFileSync(
            settingsPath,
            JSON.stringify(defaultSettings, null, 2)
          );
          logger.info("Default settings file created successfully");
        } catch (writeError) {
          logger.error("Failed to create default settings file:", writeError);
          // Continue with in-memory defaults even if write fails
        }
        return defaultSettings;
      }

      // Read and parse existing settings file
      let data;
      try {
        data = fs.readFileSync(settingsPath, "utf8");
      } catch (readError) {
        logger.error("Error reading settings file:", readError);
        // Attempt to recreate the settings file
        try {
          fs.writeFileSync(
            settingsPath,
            JSON.stringify(defaultSettings, null, 2)
          );
          logger.info("Recreated settings file after read error");
        } catch (writeError) {
          logger.error(
            "Failed to recreate settings file after read error:",
            writeError
          );
        }
        return defaultSettings;
      }

      // Parse JSON and handle syntax errors
      let savedSettings;
      try {
        savedSettings = JSON.parse(data);

        // Validate parsed data has expected structure
        if (typeof savedSettings !== "object" || savedSettings === null) {
          throw new Error("Settings file does not contain a valid object");
        }
      } catch (parseError) {
        logger.error(
          "Error parsing settings file, using defaults:",
          parseError
        );
        // Backup corrupted file for potential recovery/debugging
        try {
          const backupPath = `${settingsPath}.backup.${Date.now()}`;
          fs.writeFileSync(backupPath, data);
          logger.info(`Backed up corrupted settings file to: ${backupPath}`);

          // Recreate with defaults
          fs.writeFileSync(
            settingsPath,
            JSON.stringify(defaultSettings, null, 2)
          );
          logger.info(
            "Recreated settings file with defaults after parse error"
          );
        } catch (backupError) {
          logger.error(
            "Failed to backup/recreate corrupted settings file:",
            backupError
          );
        }
        return defaultSettings;
      }

      // Track if settings were updated and need to be saved
      let settingsChanged = false;

      // Deep merge strategy to handle nested properties
      const mergeDefaultsRecursive = (
        target: Record<string, any>,
        defaults: Record<string, any>
      ) => {
        Object.keys(defaults).forEach((key) => {
          // If property doesn't exist in target, add it
          if (target[key] === undefined) {
            target[key] = defaults[key];
            settingsChanged = true;
            logger.info(`Added missing setting: ${key}`);
            return;
          }

          // If both are objects, recurse
          if (
            typeof defaults[key] === "object" &&
            defaults[key] !== null &&
            typeof target[key] === "object" &&
            target[key] !== null &&
            !Array.isArray(defaults[key]) &&
            !Array.isArray(target[key])
          ) {
            mergeDefaultsRecursive(target[key], defaults[key]);
          }
        });
      };

      // Apply deep merge of defaults
      mergeDefaultsRecursive(savedSettings, defaultSettings);

      // Special handling for autoStart property - sync with actual system state
      const actualAutoStartStatus = getAutoStartStatus();
      if (savedSettings.general.autoStart !== actualAutoStartStatus) {
        savedSettings.general.autoStart = actualAutoStartStatus;
        settingsChanged = true;
        logger.info(
          `Updated autoStart setting to match system state: ${actualAutoStartStatus}`
        );
      }

      // Save settings if they were changed or additions were made
      if (settingsChanged) {
        try {
          fs.writeFileSync(
            settingsPath,
            JSON.stringify(savedSettings, null, 2)
          );
          logger.info(
            "Settings automatically updated with missing default values"
          );
        } catch (writeError) {
          logger.error("Failed to save updated settings:", writeError);
          // Continue with in-memory updated settings even if write fails
        }
      }

      return savedSettings;
    } catch (error) {
      // Handle any unexpected errors
      logger.error("Unexpected error in settings handling:", error);

      // Always return valid settings even in case of error
      return createDefaultSettings();
    }
  });

  // 保存应用程序设置
  ipcMain.handle("save-app-settings", (_event, data) => {
    try {
      // 验证数据完整性
      if (!data || typeof data !== "object") {
        console.error("Invalid settings data received");
        return false;
      }

      const fs = require("fs");
      const path = require("path");
      const userDataPath = app.getPath("userData");
      const settingsPath = path.join(userDataPath, "app-settings.json");

      // 处理自启动设置
      if (data.general && typeof data.general.autoStart === "boolean") {
        // 更新系统自启动设置
        const success = setAutoStart(data.general.autoStart);
        if (!success) {
          console.warn(
            "Failed to set auto-start, but will continue saving settings"
          );
        }
      }

      // 确保设置目录存在
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }

      // 写入设置文件
      fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));

      // 更新快捷键
      registerScreenshotShortcuts();

      console.log("Settings saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving app settings:", error);
      return false;
    }
  });

  // 获取应用程序版本
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });
}

// Main application execution
function main(): void {
  // Ensure single instance of the application
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    // Quit if another instance is already running
    console.log("Another instance is already running, quitting");
    app.quit();
  } else {
    // Set up event handlers
    setupAppEventHandlers();

    // Initialize app when ready
    app.whenReady().then(initializeApp);
  }
}

// Start the application
main();
