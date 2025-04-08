// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import "@sentry/electron/preload";

contextBridge.exposeInMainWorld('electronAPI', {
    isDevelopment: !!process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL,
    onScreenShotRes: (callback: any) => ipcRenderer.on('screenshot-result', (_event, value) => callback(value)),
    onStickyNoteData: (callback: any) => ipcRenderer.on('sticky-note-data', (_event, data) => callback(data)),
    removeListener(channel: string, func: (...args: unknown[]) => void) {
        ipcRenderer.removeListener(channel, (_event, ...args) => func(...args));
    },
    removeAllListeners(channel: string) {
        ipcRenderer.removeAllListeners(channel);
    },
    pinToScreen: (data: any) => ipcRenderer.invoke('pin-to-screen', data),
    toggleStickyNotePin: (data: any) => ipcRenderer.invoke('toggle-sticky-note-pin', data),
    resizeStickyNote: (data: any) => ipcRenderer.invoke('resize-sticky-note', data),
    dragStickyNote: () => ipcRenderer.invoke('drag-sticky-note'),
    openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
    getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
    saveAppSettings: (data: any) => ipcRenderer.invoke('save-app-settings', data),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})

console.log('preload.ts loaded');