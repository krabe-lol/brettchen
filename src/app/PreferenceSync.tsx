import { useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useDisplaySettings } from '@/features/pattern-viewer/DisplaySettingsContext'
import { DEFAULT_DISPLAY_SETTINGS } from '@/features/pattern-viewer/render/orientationDisplay'

/**
 * Wendet die serverseitig gespeicherten Präferenzen (Dark/Light-Mode,
 * Sprache, Anzeigeoptionen) einmalig an, sobald eine Person eingeloggt ist –
 * z. B. beim ersten Laden nach einem Login auf einem neuen Gerät. Das
 * eigentliche Speichern passiert direkt dort, wo die Änderung ausgelöst
 * wird (Header.tsx bzw. die Einstellungsseite), nicht hier – so entsteht
 * keine Rückkopplungsschleife.
 */
export function PreferenceSync() {
  const { user } = useAuth()
  const { setTheme } = useTheme()
  const { setLanguage } = useLanguage()
  const { setSettings } = useDisplaySettings()
  const appliedForUser = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      appliedForUser.current = null
      return
    }
    if (appliedForUser.current === user.documentId) return
    appliedForUser.current = user.documentId

    if (user.themePreference) setTheme(user.themePreference)
    if (user.languagePreference) setLanguage(user.languagePreference)
    // Merge statt Ersetzen: ältere gespeicherte Präferenzen können neuere
    // Felder (z. B. backwardContrast) noch nicht enthalten.
    if (user.displaySettings) setSettings({ ...DEFAULT_DISPLAY_SETTINGS, ...user.displaySettings })
  }, [user, setTheme, setLanguage, setSettings])

  return null
}
