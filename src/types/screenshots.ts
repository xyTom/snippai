/**
 * Type definitions for the Screenshots module
 */

/**
 * Logger function type
 * Represents a function that can be used for logging
 */
export type LoggerFn = (...args: unknown[]) => void;

/**
 * Logger type
 * Can be either a debugger instance or a simple logging function
 */
export type Logger = LoggerFn;

/**
 * Screenshots module options
 * Configuration options for the Screenshots module
 */
export interface ScreenshotsOpts {
  /**
   * Language settings for UI elements
   * Provides translations for various UI elements in the screenshot editor
   */
  
  /**
   * Logger for capturing debug information
   * Default: debug('electron-screenshots')
   * @see https://www.npmjs.com/package/debug
   */
  logger?: Logger;
  
  /**
   * Whether to reuse the screenshot window
   * If true, the screenshot window will be created on the first call and reused for subsequent calls
   * This speeds up the display of the screenshot window
   * Note: Since the window won't be closed, the app's 'window-all-closed' event won't be triggered
   * Default: false
   */
  singleWindow?: boolean;
}
