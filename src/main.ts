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
// 保存所有便签窗口的引用
let stickyNotes: BrowserWindow[] = [];

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
  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();
  
  // Get the shortcut from settings with fallback to default
  const shortcutKey = getSettingValue('shortcuts.screenshot', "CommandOrControl+Shift+A");
  
  console.log('Registering screenshot shortcut:', shortcutKey);
  
  // Register the shortcut with the current key from settings
  globalShortcut.register(shortcutKey, () => {
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
}

/**
 * Sets up event handlers for screenshot operations
 * @param {number} scaleFactor - The display scale factor
 */
function setupScreenshotEventHandlers(scaleFactor: number): void {
  // 保存之前活跃的应用程序信息
  let previouslyFocusedApp: string | null = null;


  // Handle successful screenshot capture
  screenshots.on("ok", (e: any, buffer: Uint8Array, bounds: any) => {
    const base64 = Buffer.from(buffer).toString("base64");
    console.log("Base64 image captured with scale factor:", scaleFactor);
    
    // Check app settings for auto-copy preference
    const isAutoCopyDisabled = getSettingValue('general.autoCopyToClipboard') === false;
    
    // Handle auto-copy based on settings
    if (isAutoCopyDisabled) {
      // Prevent default behavior (copying to clipboard)
      e.preventDefault();
      console.log('Auto copy to clipboard is disabled');
      
      // Manually end capture since we prevented the default behavior
      screenshots.endCapture();
    } else {
      // Use library's default implementation (copies to clipboard and ends capture)
      console.log('Auto copy to clipboard is enabled');
    }

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
    
    // 尝试将焦点还给之前的应用程序
    restorePreviousFocus(previouslyFocusedApp);
  });

  // Handle screenshot save
  screenshots.on("save", (e: any, buffer: Uint8Array, bounds: any) => {
    console.log("Screenshot saved", bounds);
  });

  // Handle after-save event
  screenshots.on("afterSave", (e: any, buffer: Uint8Array, bounds: any, isSaved: any) => {
    console.log("Screenshot afterSave event", isSaved);
  });
  
  screenshots.on('windowCreated', ($win: Electron.BrowserWindow) => {
    $win.on('focus', () => {
      if (process.platform === 'darwin') {
        try {
          // 记录当前活跃的应用程序，以便稍后恢复
          const { execSync } = require('child_process');
          previouslyFocusedApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
          console.log('Previously focused app:', previouslyFocusedApp);
        } catch (error) {
          console.error('Failed to get frontmost app:', error);
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
 * 尝试将焦点还给之前的应用程序
 * @param {string | null} appName - 之前活跃的应用程序名称
 */
function restorePreviousFocus(appName: string | null): void {
  if (!appName || process.platform !== 'darwin') return;
  
  setTimeout(() => {
    try {
      const { exec } = require('child_process');

      exec(`osascript -e 'tell application "${appName}" to activate'`, (error: any) => {
        if (error) {
          console.error('Failed to restore focus:', error);
        } else {
          console.log('Focus restored to:', appName);
        }
      });
    } catch (error) {
      console.error('Error restoring focus:', error);
    }
  }, 10); 
}

/**
 * Creates a sticky note window with the screenshot and result
 * @param {string} screenshot - Base64 encoded screenshot
 * @param {string} result - Analysis result
 * @returns {BrowserWindow} The sticky note window
 */
function createStickyNoteWindow(screenshot: string, result: string | null): BrowserWindow {
  // 创建一个新的浮动窗口
  const stickyNote = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 300,
    frame: false, // 无边框窗口
    backgroundColor: '#000000',
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
    },
    skipTaskbar: true, // 不在任务栏显示
    titleBarStyle: 'hidden', // 隐藏标题栏
    transparent: true, // 背景透明
  });

  // 加载主界面并传递isSticky参数（不包含大型数据如截图和结果）
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // 开发模式：添加查询参数
    stickyNote.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?isSticky=true`);
  } else {
    // 生产模式：使用hash参数
    const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    stickyNote.loadFile(filePath, {
      hash: `isSticky=true`
    }).catch(err => {
      console.error('Failed to load sticky note file:', err);
    });
  }

  // 等待窗口准备好后，通过IPC发送截图和结果数据
  stickyNote.webContents.on('did-finish-load', () => {
    stickyNote.webContents.send('sticky-note-data', {
      screenshot,
      result: result || ''
    });
  });

  // 添加窗口关闭事件
  stickyNote.on('closed', () => {
    // 从数组中移除窗口引用
    stickyNotes = stickyNotes.filter(note => note !== stickyNote);
  });

  // 保存窗口引用
  stickyNotes.push(stickyNote);

  if (process.platform === 'darwin') {
    stickyNote.setWindowButtonVisibility(false);
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
  
  // 设置IPC处理程序
  setupIpcHandlers();
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

/**
 * Gets a setting value from the app settings file
 * @param {string} path - The dot-notation path to the setting (e.g., 'general.autoCopyToClipboard')
 * @param {any} defaultValue - The default value to return if the setting is not found
 * @returns {any} The setting value or the default value
 */
function getSettingValue(path: string, defaultValue: any = null): any {
  try {
    const fs = require('fs');
    const pathModule = require('path');
    const settingsPath = pathModule.join(app.getPath('userData'), 'app-settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      return defaultValue;
    }
    
    const data = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(data);
    
    // Handle dot notation path (e.g., 'general.autoCopyToClipboard')
    const parts = path.split('.');
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
      win.setSize(width, height);
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
  
  
  
  // 获取应用程序设置
  ipcMain.handle('get-app-settings', () => {
    try {
      const settings = app.getPath('userData');
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(settings, 'app-settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
      }
      
      // 如果设置文件不存在，返回默认设置
      const defaultSettings = {
        shortcuts: {
          screenshot: 'CommandOrControl+Shift+A'
        },
        general: {
          autoCopyToClipboard: true
        }
      };
      
      return defaultSettings;
    } catch (error) {
      console.error('Error reading app settings:', error);
      return null;
    }
  });
  
  // 保存应用程序设置
  ipcMain.handle('save-app-settings', (_event, data) => {
    try {
      const settings = app.getPath('userData');
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(settings, 'app-settings.json');
      
      fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
      
      // Update shortcuts after saving settings
      registerScreenshotShortcuts();
      
      return true;
    } catch (error) {
      console.error('Error saving app settings:', error);
      return false;
    }
  });
  
  // 获取应用程序版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
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