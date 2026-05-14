import {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_SHORTCUTS, getShortcutLabel, ShortcutAction } from './shared/shortcuts';
import * as Sentry from "@sentry/electron/main";
import { logger, LogLevel, createLogger } from './utils/logger';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { exec, execFile, execSync, spawnSync, type ExecException } from 'child_process';
import os from 'os';
import Screenshots, { type Bounds } from 'electron-screenshots';
import started from 'electron-squirrel-startup';
import { TableData } from './services/excel/types';
import { settingsService } from './services/settingsService';

// Initialize Sentry for error tracking when configured.
const sentryDsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: app.isPackaged ? 'production' : 'development'
  });
}

// URL scheme for deep linking
const PROTOCOL_NAME = 'snippai';
const OPEN_FILE_ARG = '--open-file';
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.bmp',
  '.gif',
  '.webp',
  '.tiff',
  '.tif',
  '.heic'
]);

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  handleWindowsSquirrelEvent();
  app.quit();
}

// Register protocol for deep linking
if (!started && !app.isDefaultProtocolClient(PROTOCOL_NAME)) {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

// Global reference to the main window to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let screenshots: Screenshots | null = null;
let stickyNotes: BrowserWindow[] = [];
let loadingWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let areaCaptureInProgress = false;
let fullscreenCaptureInProgress = false;
let pendingImagePaths: string[] = [];

type ScreenshotCaptureEvent = {
  preventDefault: () => void;
};

function runRegistryCommand(args: string[]): void {
  const result = spawnSync('reg', args, { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    logger.warn('Windows context menu registry command failed', {
      args,
      error: result.error?.message,
      status: result.status
    });
  }
}

function registerWindowsContextMenu(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return;

  const command = `"${process.execPath}" ${OPEN_FILE_ARG} "%1"`;
  SUPPORTED_IMAGE_EXTENSIONS.forEach((extension) => {
    const baseKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${extension}\\shell\\Snippai`;
    runRegistryCommand(['add', baseKey, '/ve', '/d', 'Open with Snippai', '/f']);
    runRegistryCommand(['add', baseKey, '/v', 'Icon', '/d', process.execPath, '/f']);
    runRegistryCommand(['add', `${baseKey}\\command`, '/ve', '/d', command, '/f']);
  });
}

function unregisterWindowsContextMenu(): void {
  if (process.platform !== 'win32') return;

  SUPPORTED_IMAGE_EXTENSIONS.forEach((extension) => {
    const baseKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${extension}\\shell\\Snippai`;
    runRegistryCommand(['delete', baseKey, '/f']);
  });
}

function handleWindowsSquirrelEvent(): void {
  if (process.platform !== 'win32') return;

  const squirrelEvent = process.argv[1];
  if (squirrelEvent === '--squirrel-install' || squirrelEvent === '--squirrel-updated') {
    registerWindowsContextMenu();
  } else if (squirrelEvent === '--squirrel-uninstall') {
    unregisterWindowsContextMenu();
  }
}

function normalizeOpenFilePath(value: string): string {
  const trimmed = value.trim().replace(/^"|"$/g, '');
  if (trimmed.startsWith('file://')) {
    try {
      return fileURLToPath(trimmed);
    } catch (error) {
      logger.warn('Failed to parse file URL argument:', error);
    }
  }
  return trimmed;
}

function isSupportedImagePath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

function getOpenImageArgs(args: string[]): string[] {
  const paths: string[] = [];

  args.forEach((arg, index) => {
    if (arg === OPEN_FILE_ARG && args[index + 1]) {
      paths.push(normalizeOpenFilePath(args[index + 1]));
      return;
    }

    const maybePath = normalizeOpenFilePath(arg);
    if (!arg.startsWith('-') && isSupportedImagePath(maybePath)) {
      paths.push(maybePath);
    }
  });

  return Array.from(new Set(paths));
}

function imageFileToPngBase64(filePath: string): string | null {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return null;
  }
  return image.toPNG().toString('base64');
}

function openImageFile(filePath: string): void {
  const normalizedPath = normalizeOpenFilePath(filePath);
  if (!isSupportedImagePath(normalizedPath)) {
    dialog.showErrorBox('Unsupported File', 'Snippai can only open common image files.');
    return;
  }

  if (!fs.existsSync(normalizedPath)) {
    dialog.showErrorBox('File Not Found', `The file does not exist: ${normalizedPath}`);
    return;
  }

  try {
    const base64 = imageFileToPngBase64(normalizedPath);
    if (!base64) {
      dialog.showErrorBox('Cannot Open Image', `Snippai could not decode this image: ${normalizedPath}`);
      return;
    }

    sendScreenshotToMainWindow(base64);
    showMainWindow();
  } catch (error) {
    logger.error('Failed to open image file:', error);
    dialog.showErrorBox('Cannot Open Image', 'Snippai failed to load the selected image.');
  }
}

function queueOpenImageFiles(paths: string[]): void {
  if (paths.length === 0) return;
  pendingImagePaths.push(...paths);

  if (app.isReady()) {
    flushPendingImageFiles();
  }
}

function flushPendingImageFiles(): void {
  const paths = pendingImagePaths;
  pendingImagePaths = [];
  paths.forEach(openImageFile);
}

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
  window.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    console.log('Main window close intercepted; hiding to tray/background');
    window.hide();
  });

  // Load the application content
  loadApplicationContent(window, showOnReady);

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
function loadApplicationContent(window: BrowserWindow, openDevTools = true): void {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('Loading from dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (openDevTools) {
      window.webContents.openDevTools();
    }
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

function hideMainWindowForCapture(force = false): boolean {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    return false;
  }

  const hiddenFromScreenCapture = settingsService.getSettingValue('general.hiddenFromScreenCapture', false);
  if (!force && hiddenFromScreenCapture) {
    return false;
  }

  mainWindow.hide();
  return true;
}

function sendTrayMenuScreenshot(): void {
  void startAreaScreenshotCapture();
}

function toggleStickyNotesVisibility(): void {
  try {
    stickyNotes.forEach(stickyNote => {
      if (!stickyNote.isDestroyed()) {
        if (stickyNote.isVisible()) {
          stickyNote.hide();
        } else {
          stickyNote.showInactive();
        }
      }
    });

    stickyNotes = stickyNotes.filter(note => !note.isDestroyed());
    console.log(`Toggled visibility for ${stickyNotes.length} sticky notes`);
  } catch (error) {
    console.error('Error toggling sticky notes visibility:', error);
  }
}

function resolveTrayIcon(): Electron.NativeImage {
  const sourceLogoPath = path.join(app.getAppPath(), 'src/renderer/assets/logo.png');
  if (fs.existsSync(sourceLogoPath)) {
    const image = nativeImage.createFromPath(sourceLogoPath).resize({ width: 16, height: 16 });
    if (process.platform === 'darwin') image.setTemplateImage(true);
    return image;
  }

  const rendererAssetsDir = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/assets`);
  try {
    const packagedLogo = fs
      .readdirSync(rendererAssetsDir)
      .find((file) => /^logo.*\.png$/i.test(file));

    if (packagedLogo) {
      const image = nativeImage.createFromPath(path.join(rendererAssetsDir, packagedLogo)).resize({ width: 16, height: 16 });
      if (process.platform === 'darwin') image.setTemplateImage(true);
      return image;
    }
  } catch (error) {
    logger.debug('No packaged tray logo found:', error);
  }

  return nativeImage.createEmpty();
}

function refreshTrayMenu(): void {
  if (!tray) return;

  const screenshotAccelerator = settingsService.getSettingValue('shortcuts.screenshot', DEFAULT_SHORTCUTS.screenshot);
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide Snippai' : 'Show Snippai',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          showMainWindow();
        }
      }
    },
    {
      label: 'Take Screenshot',
      accelerator: screenshotAccelerator,
      click: sendTrayMenuScreenshot
    },
    {
      label: 'Toggle Sticky Notes',
      click: toggleStickyNotesVisibility
    },
    { type: 'separator' },
    {
      label: 'Quit Snippai',
      click: () => {
        isQuitting = true;
        globalShortcut.unregisterAll();
        tray?.destroy();
        tray = null;
        app.quit();
      }
    }
  ]));
}

function createSystemTray(): void {
  if (tray) {
    refreshTrayMenu();
    return;
  }

  tray = new Tray(resolveTrayIcon());
  tray.setToolTip('Snippai');
  tray.on('click', () => showMainWindow());
  tray.on('right-click', refreshTrayMenu);
  refreshTrayMenu();
}

async function captureActiveDisplayToBase64(): Promise<{ base64: string; display: Electron.Display }> {
  const point = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(point);
  const scaleFactor = activeDisplay.scaleFactor || 1;
  const thumbnailSize = {
    width: Math.round(activeDisplay.size.width * scaleFactor),
    height: Math.round(activeDisplay.size.height * scaleFactor)
  };
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize,
    fetchWindowIcons: false
  });

  let activeSource = sources.find((source) => source.display_id === activeDisplay.id.toString());
  if (!activeSource) {
    console.warn('Could not find screen source for the active display. Falling back to the first source.');
    activeSource = sources[0];
  }

  if (!activeSource || activeSource.thumbnail.isEmpty()) {
    throw new Error('No screen sources found');
  }

  return {
    base64: activeSource.thumbnail.toPNG().toString('base64'),
    display: activeDisplay
  };
}

async function startAreaScreenshotCapture(): Promise<void> {
  if (areaCaptureInProgress || screenshots?.$win?.isFocused()) {
    return;
  }

  areaCaptureInProgress = true;
  const hiddenMainWindow = hideMainWindowForCapture();
  if (hiddenMainWindow) {
    await delay(120);
  }

  try {
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
      areaCaptureInProgress = false;
      return;
    }

    if (!screenshots) {
      areaCaptureInProgress = false;
      showMainWindow();
      logger.error('Screenshot controller is not initialized');
      return;
    }

    await screenshots.startCapture();
  } catch (error) {
    areaCaptureInProgress = false;
    showMainWindow();
    logger.error('Failed to start screenshot capture:', error);
  }
}

async function startFullscreenScreenshotCapture(): Promise<void> {
  if (fullscreenCaptureInProgress) {
    return;
  }

  fullscreenCaptureInProgress = true;
  const hiddenMainWindow = hideMainWindowForCapture(true);

  try {
    if (hiddenMainWindow) {
      await delay(120);
    }

    const { base64, display } = await captureActiveDisplayToBase64();
    showLoadingWindow(display);
    sendScreenshotToMainWindow(base64, true);
  } catch (error) {
    console.error('Failed to capture fullscreen screenshot:', error);
    hideLoadingWindow();
    if (hiddenMainWindow) {
      showMainWindow();
    }
  } finally {
    fullscreenCaptureInProgress = false;
  }
}

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
  const screenshotController = new Screenshots({
    singleWindow: true,
    // lang: lang,
    logger: screenshotsLogger.createLoggerFn()
  });
  screenshots = screenshotController;

  // Set zoom factor when capture starts
  screenshotController.on("capture-start", () => {
    if (screenshotController.$win) {
      screenshotController.$win.webContents.setZoomFactor(1);
    }
  });

  // Register global shortcut for taking screenshots
  registerScreenshotShortcuts();

  // Configure screenshot event handlers
  setupScreenshotEventHandlers(screenshotController, scaleFactor);
}

/**
 * Registers keyboard shortcuts for screenshot functionality
 */
function registerScreenshotShortcuts(): void {
  globalShortcut.unregisterAll();

  const shortcutKey = settingsService.getSettingValue('shortcuts.screenshot', DEFAULT_SHORTCUTS.screenshot);
  const fullscreenShortcutKey = settingsService.getSettingValue('shortcuts.fullscreenScreenshot', DEFAULT_SHORTCUTS.fullscreenScreenshot);
  const hideAllStickyNotesKey = settingsService.getSettingValue('shortcuts.hideAllStickyNotes', DEFAULT_SHORTCUTS.hideAllStickyNotes);
  const pinToScreenKey = settingsService.getSettingValue('shortcuts.pinToScreen', DEFAULT_SHORTCUTS.pinToScreen);
  const disabledShortcuts = settingsService.getSettingValue('shortcuts.disabledShortcuts', {});
  const isDisabled = (action: ShortcutAction): boolean =>
    Boolean(disabledShortcuts?.[action]);

  const registerShortcut = (
    action: ShortcutAction,
    accelerator: string,
    handler: () => void | Promise<void>
  ): void => {
    if (!accelerator || isDisabled(action)) {
      console.log(`Shortcut ${action} is disabled or empty; skipping registration.`);
      return;
    }

    const registered = globalShortcut.register(accelerator, handler);
    if (!registered) {
      console.error(`Failed to register ${action} shortcut: ${accelerator}`);
      dialog.showErrorBox(
        'Shortcut Registration Failed',
        `Cannot register ${getShortcutLabel(action)} shortcut (${accelerator}). It may be in use by another application.`
      );
    }
  };

  registerShortcut('screenshot', shortcutKey, startAreaScreenshotCapture);
  registerShortcut('fullscreenScreenshot', fullscreenShortcutKey, startFullscreenScreenshotCapture);
  registerShortcut('hideAllStickyNotes', hideAllStickyNotesKey, toggleStickyNotesVisibility);

  registerShortcut('pinToScreen', pinToScreenKey, () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send('pin-current-screenshot');
  });

  refreshTrayMenu();
}


/**
 * Sets up event handlers for screenshot operations
 * @param {number} scaleFactor - The display scale factor
 */
function setupScreenshotEventHandlers(screenshotController: Screenshots, scaleFactor: number): void {
  // Create a dedicated logger for screenshot event handlers
  const eventLogger = createLogger({
    namespace: 'snippai:screenshots:events',
    level: LogLevel.DEBUG,
    consoleOutput: true
  });
  
  // Save previously active application information
  let previouslyFocusedApp: string | null = null;

  const finishAreaCapture = () => {
    areaCaptureInProgress = false;
    globalShortcut.unregister('Esc');
    showMainWindow();
    restorePreviousFocus(previouslyFocusedApp);
  };

  const cancelAreaCapture = () => {
    if (!areaCaptureInProgress) {
      return;
    }

    areaCaptureInProgress = false;
    void screenshotController.endCapture().finally(() => {
      finishAreaCapture();
    });
  };

  // Handle successful screenshot capture
  screenshotController.on("ok", (event: ScreenshotCaptureEvent, buffer: Uint8Array) => {
    areaCaptureInProgress = false;
    const base64 = Buffer.from(buffer).toString("base64");
    eventLogger.info("Screenshot captured successfully");
    eventLogger.debug("Base64 image captured with scale factor:", scaleFactor);
    
    // Check app settings for auto-copy preference
    const isAutoCopyDisabled = settingsService.getSettingValue('general.autoCopyToClipboard') === false;
    
    // Handle auto-copy based on settings
    if (isAutoCopyDisabled) {
      // Prevent default behavior (copying to clipboard)
      event.preventDefault();
      eventLogger.info('Auto copy to clipboard is disabled');
      
      // Manually end capture since we prevented the default behavior
      void screenshotController.endCapture();
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
  screenshotController.on("cancel", () => {
    eventLogger.info("Screenshot capture cancelled");
    finishAreaCapture();
  });

  // Handle screenshot save
  screenshotController.on("save", (...[, , bounds]: [ScreenshotCaptureEvent, Uint8Array, Bounds]) => {
    eventLogger.info("Screenshot saved");
    eventLogger.debug("Screenshot bounds:", bounds);
  });

  // Handle after-save event
  screenshotController.on("afterSave", (...[, , , isSaved]: [ScreenshotCaptureEvent, Uint8Array, Bounds, boolean]) => {
    eventLogger.info("Screenshot afterSave event");
    eventLogger.debug("Save status:", isSaved);
  });
  
  screenshotController.on('windowCreated', ($win: Electron.BrowserWindow) => {
    const handleBeforeInput = (event: Electron.Event, input: Electron.Input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault();
        cancelAreaCapture();
      }
    };

    $win.webContents.on('before-input-event', handleBeforeInput);

    const screenshotView = (screenshotController as Screenshots & {
      $view?: Electron.BrowserView;
    }).$view;
    screenshotView?.webContents.on('before-input-event', handleBeforeInput);

    $win.on('focus', () => {
      if (process.platform === 'darwin') {
        try {
          // 记录当前活跃的应用程序，以便稍后恢复
          previouslyFocusedApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
          eventLogger.debug('Previously focused app:', previouslyFocusedApp);
        } catch (error) {
          eventLogger.error('Failed to get frontmost app:', error);
          previouslyFocusedApp = null;
        }
        app.focus({steal: true});
      }

      globalShortcut.unregister('Esc');
      const registered = globalShortcut.register('Esc', cancelAreaCapture);
      if (!registered) {
        eventLogger.warn('Failed to register Esc shortcut for screenshot cancellation');
      }
    });

    $win.on('blur', () => {
      globalShortcut.unregister('Esc');
    });

    $win.on('closed', () => {
      globalShortcut.unregister('Esc');
      screenshotView?.webContents.removeListener('before-input-event', handleBeforeInput);
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
      exec(`osascript -e 'tell application "${appName}" to activate'`, (error: ExecException | null) => {
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
    const displays = screen.getAllDisplays();
    
    // Check if position is within any display's work area
    const isWithinDisplay = displays.some((display: Electron.Display) => {
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
    const { width } = display.workArea;
    
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

  // Keep the app accessible after the main window is closed.
  createSystemTray();
  
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
  flushPendingImageFiles();
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

  // Handle deep link on app startup (Windows/Linux)
  if (process.platform !== 'darwin') {
    const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (url) {
      // Delay handling to ensure window is ready
      setTimeout(() => handleDeepLink(url), 1000);
    }
  }
}

function handleCommandLineArgs(args: string[]): void {
  const url = args.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
  if (url) {
    handleDeepLink(url);
  }

  queueOpenImageFiles(getOpenImageArgs(args));
}

/**
 * Sets up application lifecycle event handlers
 */
function setupAppEventHandlers(): void {
  app.on('before-quit', () => {
    isQuitting = true;
  });

  // Handle second instance launch
  app.on('second-instance', (_event, commandLine) => {
    console.log('Second instance detected, focusing first instance');
    showMainWindow();
    handleCommandLineArgs(commandLine);
  });

  // Application ready event
  app.on('ready', () => {
    console.log('App ready event fired');
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    queueOpenImageFiles([filePath]);
  });

  // Window closed event
  app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (isQuitting) {
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
    if (screenshots?.$win && !screenshots.$win.isDestroyed()) {
      screenshots.$win.setContentProtection(enable);
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

  ipcMain.handle('write-clipboard-text', (_event, text: string) => {
    clipboard.writeText(text);
    return true;
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
      const saveDialogOptions = {
        title: 'Export Tables to Excel',
        defaultPath: defaultFileName || 'snippai-tables.xlsx',
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      };
      const result = mainWindow && !mainWindow.isDestroyed()
        ? await dialog.showSaveDialog(mainWindow, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions);

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
    queueOpenImageFiles(getOpenImageArgs(process.argv.slice(1)));
    
    // Initialize app when ready
    app.whenReady().then(initializeApp);
  }
}

// Start the application
main();
