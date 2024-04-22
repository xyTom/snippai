import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'path';
import * as Sentry from "@sentry/electron/main";

Sentry.init({
  dsn: "https://b07962090a9e8e5aaf2a34a0b8721a9e@o4507063511089152.ingest.us.sentry.io/4507128527781888",
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Screenshots = require('electron-screenshots');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
let mainWindow: BrowserWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
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
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }


};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
app.whenReady().then(() => {
  const screenshots = new Screenshots({singleWindow: true,});
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
    console.log("base64", base64);
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