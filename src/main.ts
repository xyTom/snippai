import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'path';
import * as Sentry from "@sentry/electron/main";

Sentry.init({
  dsn: "https://b07962090a9e8e5aaf2a34a0b8721a9e@o4507063511089152.ingest.us.sentry.io/4507128527781888",
});

const Screenshots = require('electron-screenshots');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
let mainWindow: BrowserWindow;

// 确保应用只有一个实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running, quitting');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 有人试图运行第二个实例，我们应该关注我们的窗口
    console.log('Second instance detected, focusing first instance');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 创建主窗口，加载应用等
  const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      // 添加以下配置以支持高DPI显示
      backgroundColor: '#ffffff',
      show: false, // 先创建窗口但不显示
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        // 避免自动缩放以保持屏幕截图清晰
        contextIsolation: true,
        nodeIntegration: true,
      },
      // macOS特定设置
      titleBarStyle: 'default', // 可以尝试 'hidden', 'hiddenInset', 'customButtonsOnHover'
      trafficLightPosition: { x: 10, y: 10 }, // 调整红绿灯按钮位置
      vibrancy: 'under-window', // 添加毛玻璃效果
      visualEffectState: 'active', // 活跃状态下的视觉效果
    });

    // 当窗口内容加载完成后再显示窗口
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
      mainWindow.focus();
    });

    // 确保不会模糊
    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM ready');
      mainWindow.webContents.setZoomFactor(1);
    });

    // Detect when the window is closed
    mainWindow.on('close', () => {
      console.log('Main window closed');
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      console.log('Loading from dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      // Open the DevTools.
      mainWindow.webContents.openDevTools();
    } else {
      const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
      console.log('Loading from file path:', filePath);
      mainWindow.loadFile(filePath).catch(err => {
        console.error('Failed to load file:', err);
      });
    }
  };

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', () => {
    console.log('App ready event fired');
    createWindow(); // 确保在ready事件中也创建窗口
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    console.log('App activated, window count:', BrowserWindow.getAllWindows().length);
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('Creating new window on activate');
      createWindow();
    } else {
      // 确保现有窗口是可见的
      console.log('Making existing window visible');
      const existingWindow = BrowserWindow.getAllWindows()[0];
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }
      existingWindow.show();
      existingWindow.focus();
    }
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and import them here.
  app.whenReady().then(() => {
    console.log('App ready (whenReady)');
    // 确保在 macOS 上应用启动时创建窗口
    if (!mainWindow || BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    
    // 添加全局未捕获异常处理
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });

    // 开启高DPI支持
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');

    // 获取当前屏幕的缩放因子
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;
    console.log('Primary Display Scale Factor:', scaleFactor);
    console.log('App is packaged:', app.isPackaged);
    console.log('App path:', app.getAppPath());

    const screenshots = new Screenshots({
      singleWindow: true,
      // 添加以下配置以提高截图质量
      enableHighAccuracy: true,
      // 为macOS添加特殊配置
      screenshotOptions: {
        types: ['screen'],
        captures: 'fullscreen',
      }
    });
    
    // 在截图前设置比例
    // 防止截图窗口本身被缩放导致模糊
    screenshots.on("capture-start", () => {
      if (screenshots.$win) {
        screenshots.$win.webContents.setZoomFactor(1);
      }
    });

    globalShortcut.register("CommandOrControl+Shift+A", () => {
      //check if the screenshot window is already opened
      if (screenshots.$win?.isFocused()) {
        return;
      }
      let screenshotDelay =500;
      //check if the main window is minimized
      if (mainWindow.isMinimized()) {
        screenshotDelay = 0;
      }
      //mainWindow.hide();
      //minimize the main window
      mainWindow.minimize();
      //wait the main window minimize
      setTimeout(() => {
        screenshots.startCapture();
      }, screenshotDelay);
      //after the screenshot windows is intialized, decrease the delay
    });
    globalShortcut.register("esc", () => {
      if (screenshots.$win?.isFocused()) {
        screenshots.endCapture();
      }
    });
    // 点击确定按钮回调事件
    screenshots.on("ok", (e: any, buffer: Uint8Array, bounds: any) => {
      //console.log("ok capture", buffer);
      //buffer is Uint8Array, to base64

      const base64 = Buffer.from(buffer).toString("base64");
      console.log("Base64 image captured with scale factor:", scaleFactor);
      // run(base64).then((res) => {
      //   console.log("res", res);
      //   mainWindow.webContents.send("vision-result", res);
      // }
      // );
      //send the base64 to the main window
      mainWindow.webContents.send("screenshot-result", base64);
      //show the main window
      mainWindow.show();
    });
    // 点击取消按钮回调事件
    screenshots.on("cancel", () => {
      console.log("capture", "cancel1");
      //show the main window
      mainWindow.show();
    });
    // screenshots.on("cancel", (e) => {
    //   // 执行了preventDefault
    //   // 点击取消不会关闭截图窗口
    //   e.preventDefault();
    //   console.log("capture", "cancel2");
    // });
    // 点击保存按钮回调事件
    screenshots.on("save", (e: any, buffer: Uint8Array, bounds: any) => {
      console.log("save capture", buffer, bounds);
    });
    // 保存后的回调事件
    screenshots.on("afterSave", (e: any, buffer: Uint8Array, bounds: any, isSaved: any) => {
      console.log("afterSave capture", buffer, bounds);
      console.log("isSaved", isSaved) // 是否保存成功
    });

  });
}