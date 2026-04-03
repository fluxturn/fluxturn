import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Core languages
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

// Additional languages
import it from './locales/it.json';
import ru from './locales/ru.json';
import id from './locales/id.json';
import uk from './locales/uk.json';
import ptBR from './locales/pt-BR.json';
import nl from './locales/nl.json';
import vi from './locales/vi.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import pl from './locales/pl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      zh: { translation: zh },
      ko: { translation: ko },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      ru: { translation: ru },
      id: { translation: id },
      uk: { translation: uk },
      'pt-BR': { translation: ptBR },
      nl: { translation: nl },
      vi: { translation: vi },
      ar: { translation: ar },
      hi: { translation: hi },
      pl: { translation: pl },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fluxturn-language',
    },
  });

export default i18n;
