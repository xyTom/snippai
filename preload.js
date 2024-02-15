const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    onScreenShotRes: (callback) => ipcRenderer.on('vision-result', (_event, value) => callback(value))
})