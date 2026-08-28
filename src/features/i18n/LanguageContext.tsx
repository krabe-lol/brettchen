import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

const STORAGE_KEY = 'brettchen.language'
const DEFAULT_LANGUAGE: Language = 'en'

/**
 * Temporary: the site is English-only for now. Flip back to `true` to
 * restore switching - the `de` translations and all the plumbing below
 * stay intact either way, this only gates whether anything can actually
 * select German (stored preference, the header UI, PreferenceSync
 * applying a user's saved languagePreference on login).
 */
export const LANGUAGE_SWITCHING_ENABLED = false

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
  if (!LANGUAGE_SWITCHING_ENABLED) return DEFAULT_LANGUAGE
  const raw = localStorage.getItem(STORAGE_KEY)
  return isLanguage(raw) ? raw : DEFAULT_LANGUAGE
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in params ? String(params[key]) : match))
}

/** Client-only UI language, remembered in localStorage. Translates interface text only, never pattern content. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage())

  function setLanguage(next: Language) {
    if (!LANGUAGE_SWITCHING_ENABLED) return
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
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
