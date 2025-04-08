/**
 * Types for application settings
 */

/**
 * Base interface for all application settings
 */
export interface AppSettings {
  shortcuts: ShortcutSettings;
  general: GeneralSettings;
}

/**
 * Interface for keyboard shortcut settings
 */
export interface ShortcutSettings {
  screenshot: string;
}

/**
 * Interface for general application settings
 */
export interface GeneralSettings {
  autoCopyToClipboard: boolean;
  autoStart: boolean;
  horizontalLayout: boolean;
}
