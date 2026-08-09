import { useLanguage } from './LanguageContext'
import { SUPPORTED_LANGUAGES, type Language } from './translations'

/** Language switcher dropdown (DE/EN, extendable via SUPPORTED_LANGUAGES). */
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      aria-label={t('languageSwitcherLabel')}
      className="rounded-md border bg-background px-2 py-1 text-sm text-foreground"
    >
      {SUPPORTED_LANGUAGES.map((option) => (
        <option key={option.code} value={option.code} className="bg-background text-foreground">
          {option.label}
        </option>
      ))}
    </select>
  )
}
