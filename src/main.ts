import { app, BrowserWindow, globalShortcut, ipcMain, dialog, clipboard } from 'electron';
import path from 'path';
import { DEFAULT_SHORTCUTS, getShortcutLabel } from './shared/shortcuts';
import * as Sentry from "@sentry/electron/main";
import { logger, LogLevel, createLogger } from './utils/logger';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { exec, execFile, spawn } from 'child_process';
import os from 'os';
import { TableData } from './services/excel/types';
import { settingsService } from './services/settingsService';

// Initialize Sentry for error tracking
Sentry.init({
  dsn: "https://b07962090a9e8e5aaf2a34a0b8721a9e@o4507063511089152.ingest.us.sentry.io/4507128527781888",
});

const Screenshots = require('electron-screenshots');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// URL scheme for deep linking
const PROTOCOL_NAME = 'snippai';

// Register protocol for deep linking
if (!app.isDefaultProtocolClient(PROTOCOL_NAME)) {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

// Global reference to the main window to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let screenshots: any = null;
let stickyNotes: BrowserWindow[] = [];
let loadingWindow: BrowserWindow | null = null;

/**
 * Handle deep link URL
 * @param {string} url - The deep link URL to handle
 */
function handleDeepLink(url: string): void {
  console.log('Handling deep link:', url);

  // Parse the URL to extract authentication data
  if (url.startsWith(`${PROTOCOL_NAME}://`)) {
    const urlObj = new URL(url);

    // Handle authentication callback - check multiple conditions
    // Note: urlObj.pathname might be '/callback' instead of '/auth/callback' depending on URL format
    const isAuthCallback = urlObj.pathname === '/auth/callback' ||
                          urlObj.pathname === '/callback' ||
                          urlObj.searchParams.has('access_token') ||
                          urlObj.searchParams.has('type') ||
                          urlObj.hash.includes('access_token');

    if (isAuthCallback) {
      console.log('Authentication callback received');
      console.log('URL pathname:', urlObj.pathname);
      console.log('URL search params:', Object.fromEntries(urlObj.searchParams));
      console.log('URL hash:', urlObj.hash);

      // Show and focus the main window
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();

        // Send the auth data to the renderer process
        const authData = {
          url: url,
          hash: urlObj.hash,
          searchParams: Object.fromEntries(urlObj.searchParams)
        };

        console.log('Sending auth data to renderer:', authData);
        mainWindow.webContents.send('auth-callback', authData);
      } else {
        console.error('Main window is not available');
      }
    } else {
      console.log('Deep link received but not an auth callback:', urlObj.pathname);
      console.log('URL hash:', urlObj.hash);
      console.log('URL search params:', Object.fromEntries(urlObj.searchParams));
    }
  } else {
    console.log('URL does not start with expected protocol:', url);
  }
}

/**
 * Creates and configures the main application window
 * @returns {BrowserWindow} The configured browser window instance
 */
function createMainWindow(showOnReady = true): BrowserWindow {
  console.log('Creating main window');
  
  // Configure the browser window
  const window = new BrowserWindow({
    width: 830,
    height: 600,
    minWidth: 600,
    minHeight: 300,
    backgroundColor: '#000000',
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
    },
    titleBarStyle: 'default',
    trafficLightPosition: { x: 10, y: 10 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
  });

  // Show window when ready
  if (showOnReady) {
    window.once('ready-to-show', () => {
      console.log('Window ready to show');
      window.show();
      window.focus();
    });
  }

  // Set zoom factor when DOM is ready
  window.webContents.on('dom-ready', () => {
    console.log('DOM ready');
    window.webContents.setZoomFactor(1);
  });

  // Handle window close event
  window.on('close', () => {
    console.log('Main window closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Load the application content
  loadApplicationContent(window);

  // Apply content protection setting to the main window
  try {
    const hiddenFromScreenCapture = settingsService.getSettingValue('general.hiddenFromScreenCapture', false);
    window.setContentProtection(hiddenFromScreenCapture);
  } catch (error) {
    console.error('Error applying content protection to main window:', error);
  }

  return window;
}

/**
 * Loads the appropriate content into the window based on environment
 * @param {BrowserWindow} window - The window to load content into
 */
function loadApplicationContent(window: BrowserWindow): void {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('Loading from dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open DevTools in development mode
    window.webContents.openDevTools();
  } else {
    const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('Loading from file path:', filePath);
    window.loadFile(filePath).catch(err => {
      console.error('Failed to load file:', err);
    });
  }
}

/**
 * Shows the main window, restoring it if minimized
 */
function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('Main window is not available, creating new window');
    mainWindow = createMainWindow(true);
    return;
  }
  
  console.log('Making existing window visible');
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const captureWithNativeMac = async (): Promise<string | null> => {
  const tmpPath = path.join(os.tmpdir(), `snippai_capture_${Date.now()}.png`);

  return new Promise((resolve) => {
    execFile('screencapture', ['-i', '-x', tmpPath], (err) => {
      if (err) {
        console.warn('Native macOS screenshot canceled or failed:', err);
        return resolve(null);
      }

      try {
        const buffer = fs.readFileSync(tmpPath);
        fs.unlinkSync(tmpPath);
        resolve(buffer.toString('base64'));
      } catch (readErr) {
        console.error('Failed to read native macOS screenshot output:', readErr);
        resolve(null);
      }
    });
  });
};

const captureWithNativeWindows = async (): Promise<string | null> => {
  clipboard.clear();

  return new Promise((resolve) => {
    exec('start "" "ms-screenclip:?clippingMode=Rectangle"', async (error) => {
      if (error) {
        console.warn('Failed to launch Windows screen clipping:', error);
        return resolve(null);
      }

      const timeout = Date.now() + 5000;

      while (Date.now() <= timeout) {
        const img = clipboard.readImage();
        if (!img.isEmpty()) {
          return resolve(img.toDataURL().split(',')[1]);
        }

        await delay(300);
      }

      return resolve(null);
    });
  });
};

function sendScreenshotToMainWindow(base64: string, autoPin = false): void {
  const sendToMain = (win: BrowserWindow) => {
    win.webContents.send('screenshot-result', base64, autoPin);
  };

  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow(false);
    mainWindow.webContents.once('dom-ready', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        sendToMain(mainWindow);
      }
    });
    return;
  }

  sendToMain(mainWindow);
}

/**
 * Sets up screenshot functionality
 */
function setupScreenshots(): void {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  console.log('Primary Display Scale Factor:', scaleFactor);

  // Create a dedicated logger for screenshots module
  const screenshotsLogger = createLogger({
    namespace: 'snippai:screenshots',
    level: LogLevel.DEBUG,
    consoleOutput: true
  });
  
  // Initialize screenshot module with options
  screenshots = new Screenshots({
    singleWindow: true,
    // lang: lang,
    logger: screenshotsLogger.createLoggerFn()
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
  const shortcutKey = settingsService.getSettingValue('shortcuts.screenshot', DEFAULT_SHORTCUTS.screenshot);
  const fullscreenShortcutKey = settingsService.getSettingValue('shortcuts.fullscreenScreenshot', DEFAULT_SHORTCUTS.fullscreenScreenshot);
  const hideAllStickyNotesKey = settingsService.getSettingValue('shortcuts.hideAllStickyNotes', DEFAULT_SHORTCUTS.hideAllStickyNotes);

  console.log('Registering screenshot shortcut:', shortcutKey);
  // Register screenshot and check result
  const registeredScreenshot = globalShortcut.register(shortcutKey, () => {
    // Skip if screenshot window is already focused
    if (screenshots.$win?.isFocused()) {
      return;
    }

    let screenshotDelay = 0;
    if (!mainWindow?.isDestroyed()) {
      if (!mainWindow.isMinimized() && !settingsService.getSettingValue('general.hiddenFromScreenCapture', false)) {
        screenshotDelay = 500;
      }
      mainWindow.minimize();
    }
    setTimeout(async () => {
      const useSystemScreenshot = settingsService.getSettingValue('general.useSystemScreenshot', true);
      const supportsSystemScreenshot = process.platform === 'darwin' || process.platform === 'win32';

      if (useSystemScreenshot && supportsSystemScreenshot) {
        const base64 = process.platform === 'darwin'
          ? await captureWithNativeMac()
          : await captureWithNativeWindows();

        if (base64) {
          sendScreenshotToMainWindow(base64);
        } else {
          console.log('System screenshot capture was canceled or failed');
        }

        showMainWindow();
        return;
      }

      screenshots.startCapture();
    }, screenshotDelay);
  });
  if (!registeredScreenshot) {
    console.error(`Failed to register screenshot shortcut: ${shortcutKey}`);
    dialog.showErrorBox(
      'Shortcut Registration Failed',
      `Cannot register ${getShortcutLabel('screenshot')} shortcut (${shortcutKey}). It may be in use by another application.`
    );
  }

  // 全屏截图快捷键注册
  console.log('Registering fullscreen screenshot shortcut:', fullscreenShortcutKey);
  const registeredFullscreen = globalShortcut.register(fullscreenShortcutKey, async () => {
    try {
      const { desktopCapturer, screen } = require('electron');

      // 获取鼠标指针所在的屏幕，以实现对当前活动屏幕的精确截图。
      const point = screen.getCursorScreenPoint();
      const activeDisplay = screen.getDisplayNearestPoint(point);

      // 显示 loading 窗口
      showLoadingWindow(activeDisplay);
      
      // 最小化主窗口以避免它出现在截图中
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
        mainWindow.minimize();
      }
      
      // 短暂延迟确保窗口最小化完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 使用 desktopCapturer 获取所有屏幕的源。
      const sources = await desktopCapturer.getSources({ 
        types: ['screen'],
        // 设置缩略图尺寸为活动屏幕的实际尺寸，以确保截图质量。
        thumbnailSize: { width: activeDisplay.size.width, height: activeDisplay.size.height },
        fetchWindowIcons: false
      });
      
      if (sources.length > 0) {
        // 查找与活动屏幕ID完全匹配的源，这是最可靠的方式。
        let activeSource = sources.find((source: Electron.DesktopCapturerSource) => source.display_id === activeDisplay.id.toString());

        // 如果因未知原因找不到匹配，则回退到第一个源作为保险。
        if (!activeSource) {
          console.warn('Could not find screen source for the active display. Falling back to the first source.');
          activeSource = sources[0];
        }
        
        // 获取完整尺寸的截图
        const image = activeSource.thumbnail;
        
        // 转换为 base64 - 使用 toDataURL 方法
        const pngBuffer = await image.toPNG();
        // 转换为 base64
        const base64 = Buffer.from(pngBuffer).toString('base64');
        console.log('Base64 image:', base64);
        
        const sendToMain = (win: BrowserWindow) => {
          win.webContents.send('screenshot-result', base64, true);
        };

        // 确保主窗口始终存在，即使它被关闭了
        if (!mainWindow || mainWindow.isDestroyed()) {
          // 如果主窗口不存在，就在后台创建一个新的，但不显示它
          mainWindow = createMainWindow(false);
          mainWindow.webContents.once('dom-ready', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              sendToMain(mainWindow);
            }
          });
        } else {
          // 如果主窗口存在，就直接使用它
          sendToMain(mainWindow);
        }
      } else {
        console.error('No screen sources found');
        hideLoadingWindow();
      }
    } catch (err) {
      console.error('Failed to capture fullscreen screenshot:', err);
      hideLoadingWindow();
    }
  });
  if (!registeredFullscreen) {
    console.error(`Failed to register fullscreen screenshot shortcut: ${fullscreenShortcutKey}`);
    dialog.showErrorBox(
      'Shortcut Registration Failed',
      `Cannot register ${getShortcutLabel('fullscreenScreenshot')} shortcut (${fullscreenShortcutKey}). It may be in use by another application.`
    );
  }

  // 隐藏所有便签窗口快捷键注册
  console.log('Registering hide all sticky notes shortcut:', hideAllStickyNotesKey);
  const registeredHideAllStickyNotes = globalShortcut.register(hideAllStickyNotesKey, () => {
    try {
      // 隐藏所有便签窗口
      stickyNotes.forEach(stickyNote => {
        if (!stickyNote.isDestroyed()) {
          if (stickyNote.isVisible()) {
            stickyNote.hide();
          } else {
            // 显示窗口但不抢夺焦点
            stickyNote.showInactive();
          }
        }
      });
      
      // 过滤掉已销毁的窗口
      stickyNotes = stickyNotes.filter(note => !note.isDestroyed());
      
      console.log(`Toggled visibility for ${stickyNotes.length} sticky notes`);
    } catch (error) {
      console.error('Error toggling sticky notes visibility:', error);
    }
  });
  if (!registeredHideAllStickyNotes) {
    console.error(`Failed to register hide all sticky notes shortcut: ${hideAllStickyNotesKey}`);
    dialog.showErrorBox(
      'Shortcut Registration Failed',
      `Cannot register ${getShortcutLabel('hideAllStickyNotes')} shortcut (${hideAllStickyNotesKey}). It may be in use by another application.`
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
    namespace: 'snippai:screenshots:events',
    level: LogLevel.DEBUG,
    consoleOutput: true
  });
  
  // Save previously active application information
  let previouslyFocusedApp: string | null = null;

  // Handle successful screenshot capture
  screenshots.on("ok", (e: any, buffer: Uint8Array, bounds: any) => {
    const base64 = Buffer.from(buffer).toString("base64");
    eventLogger.info("Screenshot captured successfully");
    eventLogger.debug("Base64 image captured with scale factor:", scaleFactor);
    
    // Check app settings for auto-copy preference
    const isAutoCopyDisabled = settingsService.getSettingValue('general.autoCopyToClipboard') === false;
    
    // Handle auto-copy based on settings
    if (isAutoCopyDisabled) {
      // Prevent default behavior (copying to clipboard)
      e.preventDefault();
      eventLogger.info('Auto copy to clipboard is disabled');
      
      // Manually end capture since we prevented the default behavior
      screenshots.endCapture();
    } else {
      // Use library's default implementation (copies to clipboard and ends capture)
      eventLogger.info('Auto copy to clipboard is enabled');
    }

    // Send screenshot data to renderer process
    if (!mainWindow?.isDestroyed()) {
      mainWindow.webContents.send("screenshot-result", base64);
      eventLogger.info('Screenshot sent to main window');
      showMainWindow();
    } else {
      eventLogger.warn('Main window is not available, creating new window');
      mainWindow = createMainWindow();
      //wait for window to be ready
      mainWindow.once('ready-to-show', () => {
        mainWindow.webContents.send("screenshot-result", base64);
        eventLogger.info('Screenshot sent to new main window');
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
  screenshots.on("afterSave", (e: any, buffer: Uint8Array, bounds: any, isSaved: any) => {
    eventLogger.info("Screenshot afterSave event");
    eventLogger.debug("Save status:", isSaved);
  });
  
  screenshots.on('windowCreated', ($win: Electron.BrowserWindow) => {
    $win.on('focus', () => {
      if (process.platform === 'darwin') {
        try {
          // 记录当前活跃的应用程序，以便稍后恢复
          const { execSync } = require('child_process');
          previouslyFocusedApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
          eventLogger.debug('Previously focused app:', previouslyFocusedApp);
        } catch (error) {
          eventLogger.error('Failed to get frontmost app:', error);
          previouslyFocusedApp = null;
        }
        app.focus({steal: true});
      }
      globalShortcut.register('esc', () => {
        if ($win?.isFocused()) {
          screenshots.endCapture();
        }
        restorePreviousFocus(previouslyFocusedApp);
      });
    });

    $win.on('blur', () => {
      globalShortcut.unregister('esc');
    });
  });
}

/**
 * Attempt to restore focus to the previously active application
 * @param {string | null} appName - Name of the previously active application
 */
function restorePreviousFocus(appName: string | null): void {
  if (!appName || process.platform !== 'darwin') return;
  
  setTimeout(() => {
    try {
      const { exec } = require('child_process');

      exec(`osascript -e 'tell application "${appName}" to activate'`, (error: any) => {
        if (error) {
          logger.error('Failed to restore focus:', error);
        } else {
          logger.info('Focus restored to:', appName);
        }
      });
    } catch (error) {
      logger.error('Error restoring focus:', error);
    }
  }, 10); 
}

/**
 * Validates if a window position is within screen bounds
 */
function isValidWindowPosition(position: { x: number; y: number; width?: number; height?: number }): boolean {
  try {
    const { screen } = require('electron');
    const displays = screen.getAllDisplays();
    
    // Check if position is within any display's work area
    const isWithinDisplay = displays.some((display: any) => {
      const { x, y, width, height } = display.workArea;
      return position.x >= x && position.y >= y && 
             position.x < x + width && position.y < y + height;
    });
    
    // Also validate window size if provided
    if (position.width !== undefined && position.height !== undefined) {
      return isWithinDisplay && position.width > MIN_WINDOW_WIDTH && position.height > MIN_WINDOW_HEIGHT;
    }
    
    return isWithinDisplay;
  } catch (error) {
    console.error('Error validating window position:', error);
    return false;
  }
}

/**
 * Gets saved window position from settings
 */
function getSavedStickyNotePosition(): Electron.Rectangle | null {
  try {
    const position = settingsService.getSettingValue('stickyNotePosition', null);
    if (position && position.x !== undefined && position.y !== undefined) {
      if (isValidWindowPosition(position)) {
        return position;
      }
    }
  } catch (error) {
    console.error('Error getting saved window position:', error);
  }
  return null;
}

// Constants for window position management
const POSITION_SAVE_DEBOUNCE_MS = 500;
const MIN_WINDOW_WIDTH = 200;
const MIN_WINDOW_HEIGHT = 150;

// Debounce timer for saving window position
let savePositionTimer: NodeJS.Timeout | null = null;

/**
 * Saves window position to settings with debouncing
 */
function saveStickyNotePosition(bounds: Electron.Rectangle): void {
  // Clear existing timer
  if (savePositionTimer) {
    clearTimeout(savePositionTimer);
  }
  
  // Debounce the save operation
  savePositionTimer = setTimeout(() => {
    try {
      settingsService.updateSettingValue('stickyNotePosition', {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    } catch (error) {
      console.error('Error saving window position:', error);
    }
    savePositionTimer = null;
  }, POSITION_SAVE_DEBOUNCE_MS); // Configurable debounce delay
}

/**
 * Creates a loading window to show screenshot processing status
 * @returns {BrowserWindow | null} The loading window
 */
function createLoadingWindow(display: Electron.Display): BrowserWindow | null {
  try {
    const { width, height } = display.workArea;
    
    const windowWidth = 300;
    const windowHeight = 60;
    const padding = 20;
    
    const loadingWin = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round(display.workArea.x + (width - windowWidth) / 2),
      y: display.workArea.y + padding,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // 允许使用 require
      },
      show: false,
    });
    
    // 设置窗口不可点击，避免打扰用户
    loadingWin.setIgnoreMouseEvents(true);
    //不显示在截图中
    loadingWin.setContentProtection(true);
    
    const currentLang = settingsService.getSettingValue('general.language', 'en');

    // 加载 loading 页面
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // 开发环境，直接访问 public 目录的文件
      const devUrl = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      devUrl.pathname = '/loading.html';
      devUrl.searchParams.set('lang', currentLang);
      loadingWin.loadURL(devUrl.toString());
    } else {
      // 生产环境，从打包后的目录加载
      const filePath = path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/loading.html`,
      );
      loadingWin.loadFile(filePath, { query: { lang: currentLang } });
    }
    
    loadingWin.once('ready-to-show', () => {
      loadingWin.show();
    });
    
    return loadingWin;
  } catch (error) {
    console.error('Failed to create loading window:', error);
    return null;
  }
}

/**
 * Shows the loading window with a message
 * @param {string} message - The message to display
 */
function showLoadingWindow(display: Electron.Display): void {
  if (!loadingWindow || loadingWindow.isDestroyed()) {
    loadingWindow = createLoadingWindow(display);
  }
  
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    // 显示窗口
    if (!loadingWindow.isVisible()) {
      loadingWindow.show();
      // 确保窗口在最顶层
      loadingWindow.setAlwaysOnTop(true, 'floating');
    }
  } else {
    console.error('Failed to create or access loading window');
  }
}

/**
 * Hides the loading window
 */
function hideLoadingWindow(): void {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.hide();
    loadingWindow.destroy();
  }
}

/**
 * Creates a sticky note window with the screenshot and result
 * @param {string} screenshot - Base64 encoded screenshot
 * @param {string} result - Analysis result
 * @returns {BrowserWindow} The sticky note window
 */
function createStickyNoteWindow(screenshot: string, result: string | null): BrowserWindow {
  const { screen } = require('electron');

  // 1. 确定用户当前鼠标所在的"活动屏幕"。
  const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

  // 获取应用设置和之前保存的窗口位置。
  const isHorizontalLayout = settingsService.getSettingValue('general.horizontalLayout', false);
  const savedPosition = getSavedStickyNotePosition();
  
  // 确定窗口的尺寸。
  const windowWidth = savedPosition?.width || (isHorizontalLayout ? 700 : 400);
  const windowHeight = savedPosition?.height || (isHorizontalLayout ? 400 : 500);
  const minWidth = isHorizontalLayout ? 600 : 300;
  
  let windowX: number;
  let windowY: number;

  if (savedPosition) {
    // 2. 如果有保存的位置，就进行智能适配。
    // 首先，找到这个已保存位置属于哪个屏幕。
    const savedDisplay = screen.getDisplayMatching(savedPosition);
    
    // 计算窗口左上角相对于其所在屏幕工作区左上角的偏移量。
    const offsetX = savedPosition.x - savedDisplay.workArea.x;
    const offsetY = savedPosition.y - savedDisplay.workArea.y;
    
    // 将这个偏移量应用到当前的"活动屏幕"上，得到目标坐标。
    const targetX = activeDisplay.workArea.x + offsetX;
    const targetY = activeDisplay.workArea.y + offsetY;
    
    // 3. 为防止窗口在新屏幕上溢出，对坐标进行"钳制"，确保它完全可见。
    windowX = Math.max(
      activeDisplay.workArea.x,
      Math.min(targetX, activeDisplay.workArea.x + activeDisplay.workArea.width - windowWidth)
    );
    windowY = Math.max(
      activeDisplay.workArea.y,
      Math.min(targetY, activeDisplay.workArea.y + activeDisplay.workArea.height - windowHeight)
    );

  } else {
    // 4. 如果没有任何保存记录，就在当前活动屏幕上居中显示。
    windowX = Math.round(activeDisplay.workArea.x + (activeDisplay.workArea.width - windowWidth) / 2);
    windowY = Math.round(activeDisplay.workArea.y + (activeDisplay.workArea.height - windowHeight) / 2);
  }

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowWidth,
    height: windowHeight,
    minWidth: minWidth,
    x: windowX,
    y: windowY,
    frame: false,
    backgroundColor: '#000000',
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
    },
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    transparent: true,
    show: false, // 创建时不显示，避免抢夺焦点
  };
  
  // 创建新的便签窗口
  const stickyNote = new BrowserWindow(windowOptions);

  // 设置窗口在所有工作区和全屏应用上都可见
  if (process.platform === 'darwin') {
    // macOS 上设置窗口在所有 Space 和全屏应用上都可见
    stickyNote.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else if (process.platform === 'win32') {
    // Windows 上确保窗口保持在最顶层，即使有全屏应用
    stickyNote.setAlwaysOnTop(true, 'screen-saver');
    // 设置窗口级别为最高
    stickyNote.setVisibleOnAllWorkspaces(true);
  }

  // ...existing code for loading content...
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    stickyNote.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?isSticky=true`);
  } else {
    const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    stickyNote.loadFile(filePath, {
      hash: `isSticky=true`
    }).catch(err => {
      logger.error('Failed to load sticky note file:', err);
    });
  }

  stickyNote.webContents.on('did-finish-load', () => {
    stickyNote.webContents.send('sticky-note-data', {
      screenshot,
      result: result || ''
    });
    
    // 显示窗口但不抢夺焦点
    stickyNote.showInactive();

    // 在macOS上，当主窗口隐藏时，停靠栏图标可能会消失。
    // 这行代码可以显式地再次显示它，以确保应用程序保持可访问性。
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

  // Save window position when moved or resized
  const saveCurrentPosition = () => {
    const bounds = stickyNote.getBounds();
    saveStickyNotePosition(bounds);
  };

  stickyNote.on('moved', saveCurrentPosition);
  stickyNote.on('resized', saveCurrentPosition);

  // Add window close event
  stickyNote.on('closed', () => {
    // Remove window reference from array
    stickyNotes = stickyNotes.filter(note => note !== stickyNote);
    logger.debug('Sticky note closed, remaining notes:', stickyNotes.length);
  });

  // Save position before window closes
  stickyNote.on('close', () => {
    try {
      if (!stickyNote.isDestroyed()) {
        const bounds = stickyNote.getBounds();
        // Force immediate save on window close
        if (savePositionTimer) {
          clearTimeout(savePositionTimer);
          savePositionTimer = null;
        }
        
        settingsService.updateSettingValue('stickyNotePosition', {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
      }
    } catch (error) {
      // Window might be destroyed, ignore error
      console.debug('Window close position save error (expected):', error.message);
    }
  });

  // Save window reference
  logger.debug('Created new sticky note window');
  stickyNotes.push(stickyNote);

  if (process.platform === 'darwin') {
    stickyNote.setWindowButtonVisibility(false);
  }

  // Apply content protection setting to the new sticky note window
  try {
    const hiddenFromScreenCapture = settingsService.getSettingValue('general.hiddenFromScreenCapture', false);
    stickyNote.setContentProtection(hiddenFromScreenCapture);
  } catch (error) {
    console.error('Error applying content protection to sticky note:', error);
  }

  return stickyNote;
}

/**
 * Handles application initialization and lifecycle
 */
function initializeApp(): void {
  console.log('App ready (whenReady)');

  // Create window if needed
  if (!mainWindow || BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow(true);
  }

  // Set up global error handler
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
  });

  // Configure high DPI support
  app.commandLine.appendSwitch('high-dpi-support', '1');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');

  // Log application info
  console.log('App is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());

  // Set up screenshot functionality
  setupScreenshots();
  
  // 设置IPC处理程序
  setupIpcHandlers();
  
  // 应用初始内容保护设置
  try {
    const hiddenFromScreenCapture = settingsService.getSettingValue('general.hiddenFromScreenCapture', false);
    applyContentProtectionSettings(hiddenFromScreenCapture);
  } catch (error) {
    console.error('Error applying initial content protection settings:', error);
  }

  // Setup deep link handling
  setupDeepLinkHandling();
}

/**
 * Setup deep link handling for authentication
 */
function setupDeepLinkHandling(): void {
  // Handle protocol on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Handle protocol on Windows/Linux
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }

    // Handle deep link from command line
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle deep link on app startup (Windows/Linux)
  if (process.platform !== 'darwin') {
    const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (url) {
      // Delay handling to ensure window is ready
      setTimeout(() => handleDeepLink(url), 1000);
    }
  }
}

/**
 * Sets up application lifecycle event handlers
 */
function setupAppEventHandlers(): void {
  // Handle second instance launch
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected, focusing first instance');
    showMainWindow();
  });

  // Application ready event
  app.on('ready', () => {
    console.log('App ready event fired');
    mainWindow = createMainWindow(true);
  });

  // Window closed event
  app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // App activation event (macOS)
  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    console.log('App activated, window count:', BrowserWindow.getAllWindows().length);
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('Creating new window on activate');
      mainWindow = createMainWindow(true);
    } else {
      showMainWindow();
    }
  });
}

/**
 * 应用内容保护设置到所有窗口
 * @param {boolean} enable - 是否启用内容保护（隐藏窗口不被截屏）
 */
function applyContentProtectionSettings(enable: boolean): void {
  try {
    // 应用到主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setContentProtection(enable);
    }
    
    // 应用到所有便签窗口
    stickyNotes.forEach(window => {
      if (!window.isDestroyed()) {
        window.setContentProtection(enable);
      }
    });
    
    // 应用到截图窗口（如果存在）
    if (screenshots && screenshots.win && !screenshots.win.isDestroyed()) {
      screenshots.win.setContentProtection(enable);
    }
    
    console.log(`Content protection ${enable ? 'enabled' : 'disabled'} for all windows`);
  } catch (error) {
    console.error('Error applying content protection settings:', error);
  }
}

/**
 * 设置所有IPC处理程序
 */
function setupIpcHandlers(): void {
  // 处理pinToScreen请求
  ipcMain.handle('pin-to-screen', (_event, data) => {
    console.log('Pin to screen requested', data);
    const { screenshot, result } = data;
    createStickyNoteWindow(screenshot, result);
    return true;
  });
  
  // 处理便签窗口的置顶切换
  ipcMain.handle('toggle-sticky-note-pin', (_event, { isPinned }) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      win.setAlwaysOnTop(isPinned);
    }
    return true;
  });
  
  // 处理便签窗口的大小调整
  ipcMain.handle('resize-sticky-note', (_event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      // 检查布局设置
      const isHorizontalLayout = settingsService.getSettingValue('general.horizontalLayout', false);
      
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
  ipcMain.handle('drag-sticky-note', (_event) => {
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
  ipcMain.handle('open-dev-tools', (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    return true;
  });
  
  /**
   * Get application settings from storage or create default settings if not found
   * Implements robust error handling and auto-recovery for corrupted config files
   */
  ipcMain.handle('get-app-settings', () => {
    return settingsService.getSettings();
  });
  
  // 保存应用程序设置
  ipcMain.handle('save-app-settings', (_event, data) => {
    try {
      // Save settings using the centralized service
      const success = settingsService.saveSettings(data);
      
      if (success) {
        // Handle content protection settings
        if (data.general && typeof data.general.hiddenFromScreenCapture === 'boolean') {
          applyContentProtectionSettings(data.general.hiddenFromScreenCapture);
        }
        
        // Update shortcuts
        registerScreenshotShortcuts();
        
        console.log('Settings saved successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Error saving app settings:', error);
      return false;
    }
  });
  
  // 获取应用程序版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

// Excel table export function
  ipcMain.handle('export-excel-tables', async (_event, data) => {
    try {
      const { tables, defaultFileName } = data;
      
      if (!tables || tables.length === 0) {
        logger.error('No tables provided for export');
        return { success: false, error: 'No tables provided' };
      }

      // show save dialog
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Export Tables to Excel',
        defaultPath: defaultFileName || 'snippai-tables.xlsx',
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        logger.info('Excel export cancelled by user');
        return { success: false, cancelled: true };
      }

      const workbook = XLSX.utils.book_new();

      tables.forEach((table: TableData, index: number) => {
        if (!table.headers || table.headers.length === 0) {
          logger.warn(`Skipping invalid table at index ${index}`);
          return;
        }

        const worksheetData = [
          table.headers,
          ...(table.rows || [])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        const sheetName = `Table${index + 1}`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      await fs.promises.writeFile(result.filePath, wbout);

      logger.info(`Excel file exported successfully to: ${result.filePath}`);
      return { 
        success: true, 
        filePath: result.filePath,
        fileName: path.basename(result.filePath)
      };

    } catch (error) {
      logger.error('Error exporting Excel file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Handle screenshot analysis complete
  ipcMain.on('screenshot-analysis-complete', () => {
    hideLoadingWindow();
  });
}

// Main application execution
function main(): void {
  // Ensure single instance of the application
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    // Quit if another instance is already running
    console.log('Another instance is already running, quitting');
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
