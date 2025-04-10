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
 * Language interface for UI elements
 * Contains translations for various UI elements in the screenshot editor
 */
export interface Lang {
  /**
   * Label for magnifier position
   * English: "Magnifier Position"
   * Chinese: "放大镜位置"
   */
  magnifier_position_label?: string;
  
  /**
   * Title for confirm operation button
   * English: "Confirm"
   * Chinese: "确认"
   */
  operation_ok_title?: string;
  
  /**
   * Title for cancel operation button
   * English: "Cancel"
   * Chinese: "取消"
   */
  operation_cancel_title?: string;
  
  /**
   * Title for save operation button
   * English: "Save"
   * Chinese: "保存"
   */
  operation_save_title?: string;
  
  /**
   * Title for redo operation button
   * English: "Redo"
   * Chinese: "重做"
   */
  operation_redo_title?: string;
  
  /**
   * Title for undo operation button
   * English: "Undo"
   * Chinese: "撤销"
   */
  operation_undo_title?: string;
  
  /**
   * Title for mosaic operation button
   * English: "Mosaic"
   * Chinese: "马赛克"
   */
  operation_mosaic_title?: string;
  
  /**
   * Title for text operation button
   * English: "Text"
   * Chinese: "文本"
   */
  operation_text_title?: string;
  
  /**
   * Title for brush operation button
   * English: "Brush"
   * Chinese: "画笔"
   */
  operation_brush_title?: string;
  
  /**
   * Title for arrow operation button
   * English: "Arrow"
   * Chinese: "箭头"
   */
  operation_arrow_title?: string;
  
  /**
   * Title for ellipse operation button
   * English: "Ellipse"
   * Chinese: "椭圆"
   */
  operation_ellipse_title?: string;
  
  /**
   * Title for rectangle operation button
   * English: "Rectangle"
   * Chinese: "矩形"
   */
  operation_rectangle_title?: string;
}

/**
 * Screenshots module options
 * Configuration options for the Screenshots module
 */
export interface ScreenshotsOpts {
  /**
   * Language settings for UI elements
   * Provides translations for various UI elements in the screenshot editor
   */
  lang?: Lang;
  
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
