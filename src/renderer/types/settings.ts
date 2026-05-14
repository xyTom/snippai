/**
 * Types for application settings
 */

import { LanguageCode } from '@/utils/i18next';
import { ShortcutAction, DEFAULT_SHORTCUTS } from '../../shared/shortcuts';

/**
 * Window position and size information
 */
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * All shortcuts are stored in Record<ShortcutAction,string> for scalability.
 */
export type ShortcutsRecord = Record<ShortcutAction, string>;

// Backward compatibility alias
export type ShortcutSettings = ShortcutsRecord;

/**
 * Base interface for all application settings
 */
export interface AppSettings {
  shortcuts: ShortcutsRecord;
  general: GeneralSettings;
  stickyNotePosition?: WindowBounds;
}

/**
 * Interface for general application settings
 */
export interface GeneralSettings {
  autoCopyToClipboard: boolean;
  autoStart: boolean;
  horizontalLayout: boolean;
  uiLanguage: LanguageCode;
  hiddenFromScreenCapture: boolean;
  useSystemScreenshot: boolean;
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutsRecord = { ...DEFAULT_SHORTCUTS };
