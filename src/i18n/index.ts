import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';
import zh from './zh.json';
import ja from './ja.json';

const resources = {
   en: { translation: en },
   vi: { translation: vi },
   zh: { translation: zh },
   ja: { translation: ja },
};

// Get saved language or default to English
const savedLanguage = localStorage.getItem('language') || 'en';

i18n.use(initReactI18next).init({
   resources,
   lng: savedLanguage,
   fallbackLng: 'en',
   interpolation: {
      escapeValue: false,
   },
});

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
   localStorage.setItem('language', lng);
});

export default i18n;
