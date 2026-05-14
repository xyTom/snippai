// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import "@sentry/electron/preload";
import { TableData } from './services/excel/types';

contextBridge.exposeInMainWorld('electronAPI', {
    isDevelopment: !!process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL,
    platform: process.platform,
    onScreenShotRes: (callback: any) => ipcRenderer.on('screenshot-result', (_event, value, autoPin) => callback(value, autoPin)),
    onStickyNoteData: (callback: any) => ipcRenderer.on('sticky-note-data', (_event, data) => callback(data)),
    onPinCurrentScreenshot: (callback: any) => ipcRenderer.on('pin-current-screenshot', () => callback()),
    onAuthCallback: (callback: any) => ipcRenderer.on('auth-callback', (_event, data) => callback(data)),
    sendMessage: (channel: string, data?: any) => ipcRenderer.send(channel, data),
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
    writeClipboardText: (text: string) => ipcRenderer.invoke('write-clipboard-text', text),
    exportExcelTables: (data: { tables: TableData[]; defaultFileName?: string }) => ipcRenderer.invoke('export-excel-tables', data),
})

console.log('preload.ts loaded');
