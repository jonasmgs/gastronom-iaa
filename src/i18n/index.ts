import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from './locales/pt';
import en from './locales/en';
import es from './locales/es';
import de from './locales/de';
import it from './locales/it';
import fr from './locales/fr';

export const supportedLanguages = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      it: { translation: it },
      fr: { translation: fr },
    },
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng: string) => {
        const base = lng.split('-')[0];
        const supported = ['pt', 'en', 'es', 'de', 'it', 'fr'];
        return supported.includes(base) ? base : 'pt';
      },
    },
  });

// Update <html> lang attribute on language change
const updateHtmlLang = (lng: string) => {
  const langMap: Record<string, string> = { pt: 'pt-BR', en: 'en', es: 'es', de: 'de', it: 'it', fr: 'fr' };
  document.documentElement.lang = langMap[lng] || lng;
};
updateHtmlLang(i18n.language || 'pt');
i18n.on('languageChanged', updateHtmlLang);

export default i18n;
