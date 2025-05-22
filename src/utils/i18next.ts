import i18n from 'i18next';
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import es from '../locales/es.json';

export type LanguageCode = 'default' | 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:    { translation: en },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      ja:    { translation: ja },
      ko:    { translation: ko },
      es:    { translation: es },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'uiLanguage',
    }
  });

export default i18n;