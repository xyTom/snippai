import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'path';
import * as Sentry from "@sentry/electron/main";

// Initialize Sentry for error tracking
Sentry.init({
  dsn: "https://b07962090a9e8e5aaf2a34a0b8721a9e@o4507063511089152.ingest.us.sentry.io/4507128527781888",
});

const Screenshots = require('electron-screenshots');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global reference to the main window to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let screenshots: any = null;

/**
 * Creates and configures the main application window
 * @returns {BrowserWindow} The configured browser window instance
 */
function createMainWindow(): BrowserWindow {
  console.log('Creating main window');
  
  // Configure the browser window
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
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
  window.once('ready-to-show', () => {
    console.log('Window ready to show');
    window.show();
    window.focus();
  });

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
    mainWindow = createMainWindow();
    return;
  }
  
  console.log('Making existing window visible');
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

/**
 * Sets up screenshot functionality
 */
function setupScreenshots(): void {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  console.log('Primary Display Scale Factor:', scaleFactor);

  // Initialize screenshot module
  screenshots = new Screenshots({
    singleWindow: true,
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
  // Register global shortcut for taking screenshots
  globalShortcut.register("CommandOrControl+Shift+A", () => {
    // Skip if screenshot window is already focused
    if (screenshots.$win?.isFocused()) {
      return;
    }

    let screenshotDelay = 0;
    // Reduce delay if main window is already minimized
    if (!mainWindow?.isDestroyed()) {
      if (!mainWindow.isMinimized()) {
        screenshotDelay = 500;
        }
      // Minimize main window before taking screenshot
      mainWindow.minimize();
    }

    // Start capture after delay
    setTimeout(() => {
      screenshots.startCapture();
    }, screenshotDelay);
  });

  // Register escape key to cancel screenshot
  globalShortcut.register("esc", () => {
    if (screenshots.$win?.isFocused()) {
      screenshots.endCapture();
    }
  });
}

/**
 * Sets up event handlers for screenshot operations
 * @param {number} scaleFactor - The display scale factor
 */
function setupScreenshotEventHandlers(scaleFactor: number): void {
  // Handle successful screenshot capture
  screenshots.on("ok", (e: any, buffer: Uint8Array, bounds: any) => {
    const base64 = Buffer.from(buffer).toString("base64");
    console.log("Base64 image captured with scale factor:", scaleFactor);

    // Send screenshot data to renderer process
    if (!mainWindow?.isDestroyed()) {
      mainWindow.webContents.send("screenshot-result", base64);
      showMainWindow();
    } else {
      console.log('Main window is not available, creating new window');
      mainWindow = createMainWindow();
      //wait for window to be ready
      mainWindow.once('ready-to-show', () => {
        mainWindow.webContents.send("screenshot-result", base64);
      });
    }
  });

  // Handle screenshot cancellation
  screenshots.on("cancel", () => {
    console.log("Screenshot capture cancelled");
    showMainWindow();
  });

  // Handle screenshot save
  screenshots.on("save", (e: any, buffer: Uint8Array, bounds: any) => {
    console.log("Screenshot saved", bounds);
  });

  // Handle after-save event
  screenshots.on("afterSave", (e: any, buffer: Uint8Array, bounds: any, isSaved: any) => {
    console.log("Screenshot afterSave event", isSaved);
  });
}

/**
 * Handles application initialization and lifecycle
 */
function initializeApp(): void {
  console.log('App ready (whenReady)');

  // Create window if needed
  if (!mainWindow || BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
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
    mainWindow = createMainWindow();
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
      mainWindow = createMainWindow();
    } else {
      showMainWindow();
    }
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