/**
 * Internationalization utilities for Snippai application
 * Provides language translations for UI elements
 */

import { Lang } from '../types/screenshots';

/**
 * Default English translations
 */
export const DEFAULT_LANG: Lang = {
  // Magnifier position label
  magnifier_position_label: 'X, Y',
  
  // Operation titles
  operation_ok_title: 'Confirm',
  operation_cancel_title: 'Cancel',
  operation_save_title: 'Save',
  operation_redo_title: 'Redo',
  operation_undo_title: 'Undo',
  operation_mosaic_title: 'Mosaic',
  operation_text_title: 'Text',
  operation_brush_title: 'Brush',
  operation_arrow_title: 'Arrow',
  operation_ellipse_title: 'Ellipse',
  operation_rectangle_title: 'Rectangle',
};

/**
 * Chinese translations
 */
export const ZH_CN_LANG: Lang = {
  magnifier_position_label: '放大镜位置',
  operation_ok_title: '确认',
  operation_cancel_title: '取消',
  operation_save_title: '保存',
  operation_redo_title: '重做',
  operation_undo_title: '撤销',
  operation_mosaic_title: '马赛克',
  operation_text_title: '文本',
  operation_brush_title: '画笔',
  operation_arrow_title: '箭头',
  operation_ellipse_title: '椭圆',
  operation_rectangle_title: '矩形',
};

/**
 * Available language codes
 */
export type LanguageCode = 'en' | 'zh-CN';

/**
 * Language map containing all available translations
 */
export const LANGUAGES: Record<LanguageCode, Lang> = {
  'en': DEFAULT_LANG,
  'zh-CN': ZH_CN_LANG,
};

/**
 * Get language translations by language code
 * @param code Language code
 * @returns Language translations
 */
export function getLanguage(code: LanguageCode | string): Lang {
  return LANGUAGES[code as LanguageCode] || DEFAULT_LANG;
}
