import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_DISPLAY_SETTINGS } from './render/orientationDisplay'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/features/toast/ToastContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { updateUserPreferences } from '@/lib/strapi/auth'
import type { DisplaySettings } from './render/orientationDisplay'

interface DisplaySettingsContextValue {
  settings: DisplaySettings
  setSettings: (settings: DisplaySettings) => void
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null)

/**
 * Eine gemeinsame Anzeigeeinstellung für alle Schär-/Drehmuster-Diagramme
 * der App (PatternEditor, PatternViewer, Einstellungsseite) – so wirkt sich
 * eine Änderung überall sofort aus, egal wo sie ausgelöst wurde. Rein
 * clientseitiger State (ändert nie das gespeicherte Muster); für eingeloggte
 * Personen wird der zuletzt gespeicherte Stand einmalig nach dem Login
 * übernommen (siehe PreferenceSync), explizit gespeichert wird nur auf der
 * Einstellungsseite (kein automatisches Speichern bei jeder Änderung, um
 * keine unnötigen Schreibzugriffe bei bloßem Ausprobieren zu erzeugen).
 */
export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS)
  return <DisplaySettingsContext.Provider value={{ settings, setSettings }}>{children}</DisplaySettingsContext.Provider>
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext)
  if (!context) throw new Error('useDisplaySettings muss innerhalb von DisplaySettingsProvider verwendet werden')
  return context
}

/**
 * Speichert die aktuellen Anzeigeoptionen als Benutzerpräferenz – für den
 * "Als Standard festlegen"-Button in DisplaySettingsCard, überall dort
 * nutzbar, wo die Card eingebunden ist (Einstellungsseite, PatternEditor,
 * PatternViewer). Ohne Login gibt es keinen Server, bei dem gespeichert
 * werden könnte – `isAvailable` sagt der Card, den Button dafür deaktiviert
 * mit erklärendem Tooltip zu zeigen, statt ihn klickbar zu lassen.
 */
export function useSaveDisplaySettingsAsDefault() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { toast } = useToast()
  const { settings } = useDisplaySettings()
  const [isSaving, setIsSaving] = useState(false)

  async function onSaveAsDefault() {
    if (!token) return
    setIsSaving(true)
    try {
      await updateUserPreferences(token, { displaySettings: settings })
      toast(t('accountSettingsSaved'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return { onSaveAsDefault, isSaving, isAvailable: Boolean(token) }
}
