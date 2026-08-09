import { useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useDisplaySettings } from '@/features/pattern-viewer/DisplaySettingsContext'
import { DEFAULT_DISPLAY_SETTINGS } from '@/features/pattern-viewer/render/orientationDisplay'

/**
 * Applies the server-saved preferences (dark/light mode, language, display
 * options) once a user is logged in - e.g. on first load after logging in
 * on a new device. Saving happens where the change is triggered (Header.tsx
 * or the settings page), not here, to avoid a feedback loop.
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
    // Merge, don't replace: older saved preferences may not have newer fields yet (e.g. backwardContrast).
    if (user.displaySettings) setSettings({ ...DEFAULT_DISPLAY_SETTINGS, ...user.displaySettings })
  }, [user, setTheme, setLanguage, setSettings])

  return null
}
