import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

const STORAGE_KEY = 'brettchen.language'
const DEFAULT_LANGUAGE: Language = 'de'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function isLanguage(value: string | null): value is Language {
  return value === 'de' || value === 'en'
}

function readStoredLanguage(): Language {
  const raw = localStorage.getItem(STORAGE_KEY)
  return isLanguage(raw) ? raw : DEFAULT_LANGUAGE
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in params ? String(params[key]) : match))
}

/** Rein clientseitige UI-Sprache, in localStorage gemerkt. Übersetzt nur Interface-Texte, nie Musterinhalte. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage())

  function setLanguage(next: Language) {
    localStorage.setItem(STORAGE_KEY, next)
    setLanguageState(next)
  }

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    return interpolate(translations[language][key], params)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage muss innerhalb von LanguageProvider verwendet werden')
  return context
}
