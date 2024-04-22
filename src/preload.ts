// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import "@sentry/electron/preload";

contextBridge.exposeInMainWorld('electronAPI', {
    onScreenShotRes: (callback: any) => ipcRenderer.on('screenshot-result', (_event, value) => callback(value)),
    removeListener(channel: string, func: (...args: unknown[]) => void) {
        ipcRenderer.removeListener(channel, (_event, ...args) => func(...args));
    },
    removeAllListeners(channel: string) {
        ipcRenderer.removeAllListeners(channel);
    },
})

console.log('preload.ts loaded');