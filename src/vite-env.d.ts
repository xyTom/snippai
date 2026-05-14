/// <reference types="vite/client" />

import type { AppSettings } from "./renderer/types/settings";
import type { ExportResult, TableData } from "./services/excel/types";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PUBLIC_POSTHOG_KEY?: string;
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_PORTKEY_API_KEY?: string;
  readonly VITE_PORTKEY_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface SnippaiElectronAPI {
    isDevelopment?: boolean;
    platform?: NodeJS.Platform;
    onScreenShotRes?: (
      callback: (value: string, autoPin?: boolean) => void
    ) => void;
    onStickyNoteData?: (
      callback: (data: { screenshot?: string; result?: string }) => void
    ) => void;
    onPinCurrentScreenshot?: (callback: () => void) => void;
    onAuthCallback?: (callback: (data: unknown) => void) => void;
    sendMessage?: (channel: string, data?: unknown) => void;
    removeListener?: (
      channel: string,
      func: (...args: unknown[]) => void
    ) => void;
    removeAllListeners?: (channel: string) => void;
    pinToScreen?: (data: unknown) => Promise<unknown>;
    toggleStickyNotePin?: (data: unknown) => Promise<unknown>;
    resizeStickyNote?: (data: unknown) => Promise<unknown>;
    dragStickyNote?: () => Promise<unknown>;
    openDevTools?: () => Promise<unknown>;
    getAppSettings?: () => Promise<AppSettings>;
    saveAppSettings?: (data: AppSettings) => Promise<boolean>;
    getAppVersion?: () => Promise<string>;
    readClipboardText?: () => Promise<string>;
    writeClipboardText?: (text: string) => Promise<boolean>;
    openExternal?: (url: string) => void;
    exportExcelTables?: (data: {
      tables: TableData[];
      defaultFileName?: string;
    }) => Promise<ExportResult>;
  }

  interface Window {
    electronAPI?: SnippaiElectronAPI;
  }
}

export {};
