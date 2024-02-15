const { app, BrowserWindow,globalShortcut,ipcMain,Menu  } = require('electron');
const path = require('path');
const isDev = app.isPackaged ? false : true;
const Screenshots = require('electron-screenshots');
const { run } = require('./Gemini');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });
  // const menu = Menu.buildFromTemplate([
  //   {
  //     label: app.name,
  //     submenu: [
  //       {
  //         click: () => mainWindow.webContents.send('update-counter', 1),
  //         label: 'Increment'
  //       },
  //       {
  //         click: () => mainWindow.webContents.send('update-counter', -1),
  //         label: 'Decrement'
  //       }
  //     ]
  //   }
  // ])
  // Menu.setApplicationMenu(menu)
  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  //mainWindow.loadURL(startURL);
  mainWindow.loadFile("./build/index.html")

  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.whenReady().then(() => {
  const screenshots = new Screenshots();
  globalShortcut.register("ctrl+shift+a", () => {
    //minimize the main window
    mainWindow.minimize();
    //wait the main window minimize
    setTimeout(() => {
      screenshots.startCapture();
    }, 200);
    //screenshots.$view.webContents.openDevTools();
  });
  globalShortcut.register("esc", () => {
    if (screenshots.$win?.isFocused()) {
      screenshots.endCapture();
    }
  });
  // 点击确定按钮回调事件
  screenshots.on("ok", (e, buffer, bounds) => {
    //console.log("ok capture", buffer);
    //buffer is Uint8Array, to base64

    let base64 = Buffer.from(buffer).toString("base64");
    console.log("base64", base64);
    run(base64).then((res) => {
      console.log("res", res);
      mainWindow.webContents.send("vision-result", res);
    }
    );
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
  screenshots.on("save", (e, buffer, bounds) => {
    console.log("save capture", buffer, bounds);
  });
  // 保存后的回调事件
  screenshots.on("afterSave", (e, buffer, bounds, isSaved) => {
    console.log("afterSave capture", buffer, bounds);
    console.log("isSaved", isSaved) // 是否保存成功
  });

});
