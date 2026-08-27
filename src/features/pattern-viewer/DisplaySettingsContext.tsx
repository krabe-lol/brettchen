import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_DISPLAY_SETTINGS } from './render/orientationDisplay'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/features/toast/ToastContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { updateUserPreferences } from '@/lib/strapi/auth'
import type { DisplaySettings } from './render/orientationDisplay'
import { errorMessage } from '@/lib/utils'

interface DisplaySettingsContextValue {
  settings: DisplaySettings
  setSettings: (settings: DisplaySettings) => void
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null)

/**
 * One shared display setting for all threading/turning diagrams in the app
 * (PatternEditor, PatternViewer, settings page) - so a change takes effect
 * everywhere immediately, no matter where it's triggered. Client-only
 * state (never changes the saved pattern); for logged-in users, the
 * last-saved state is applied once after login (see PreferenceSync).
 * Explicit saving only happens on the settings page (no autosave on every
 * change, to avoid unnecessary writes while just trying things out).
 */
export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS)
  return <DisplaySettingsContext.Provider value={{ settings, setSettings }}>{children}</DisplaySettingsContext.Provider>
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext)
  if (!context) throw new Error('useDisplaySettings must be used within DisplaySettingsProvider')
  return context
}

/**
 * Saves the current display options as a user preference - for the "set
 * as default" button in DisplaySettingsCard, usable wherever the card is
 * embedded (settings page, PatternEditor, PatternViewer). Without login
 * there's no server to save to - `isAvailable` tells the card to show the
 * button disabled with an explanatory tooltip instead of clickable.
 * `hasChanges` is a separate flag (no tooltip, just disables the button):
 * true once the current settings differ from the already-saved default,
 * so there's nothing to click until something actually changed.
 */
export function useSaveDisplaySettingsAsDefault() {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { toast } = useToast()
  const { settings } = useDisplaySettings()
  const [isSaving, setIsSaving] = useState(false)

  const savedDefault: DisplaySettings = { ...DEFAULT_DISPLAY_SETTINGS, ...user?.displaySettings }
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedDefault)

  async function onSaveAsDefault() {
    if (!token) return
    setIsSaving(true)
    try {
      await updateUserPreferences(token, { displaySettings: settings })
      toast(t('accountSettingsSaved'))
    } catch (err) {
      toast(errorMessage(err, t('accountSettingsError')), { variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return { onSaveAsDefault, isSaving, isAvailable: Boolean(token), hasChanges }
}
