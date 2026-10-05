import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Minimal bilingual layer (Arabic default / English) for the dashboards.
 * Persists choice in localStorage and flips document dir/lang so the whole
 * layout mirrors correctly for LTR English.
 */
const KEY = 'tapwin_lang';

const STRINGS = {
  dashboard: ['الرئيسية', 'Home'],
  users: ['إدارة المستخدمين', 'Users'],
  analytics: ['إحصائيات التطبيق', 'Analytics'],
  activity: ['سجل النشاط', 'Activity log'],
  settings: ['الإعدادات', 'Settings'],
  logout: ['تسجيل الخروج', 'Log out'],
  adminPanel: ['لوحة التحكم', 'Admin Panel'],
  language: ['اللغة', 'Language'],
  arabic: ['العربية', 'العربية'],
  english: ['الإنجليزية', 'English'],
  appVersion: ['إصدار الواجهة', 'Dashboard version'],
  backendUrl: ['عنوان الخادم', 'Backend URL'],
  appearance: ['المظهر', 'Appearance'],
  themeNote: ['الخلفية سوداء والنص أبيض بأسلوب زجاجي موحد.', 'Black background, white text, unified glass surfaces.'],
  save: ['حفظ', 'Save'],
};

const I18nCtx = createContext({ lang: 'ar', t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(KEY) || 'ar');

  useEffect(() => {
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }, [lang]);

  const t = (key) => {
    const pair = STRINGS[key];
    if (!pair) return key;
    return lang === 'en' ? pair[1] : pair[0];
  };

  return <I18nCtx.Provider value={{ lang, t, setLang }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}
