import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { Language, messages, MessageKey } from './messages';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey | string, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'dcim_language';
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'ru' ? saved : 'ru';
  });

  const setLanguage = (value: Language) => {
    localStorage.setItem(STORAGE_KEY, value);
    setLanguageState(value);
  };

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, vars) => {
      const template = messages[language][key as MessageKey] ?? messages.en[key as MessageKey] ?? key;
      if (!vars) return template;
      return Object.entries(vars).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), template);
    }
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
