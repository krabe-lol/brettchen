import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_PATTERN_HIGHLIGHT_SETTINGS,
  deletePatternHighlightSettings,
  fetchPatternHighlightSettings,
  savePatternHighlightSettings,
  type PatternHighlightSettings,
} from '@/lib/strapi/patternPreferences'

const SAVE_DEBOUNCE_MS = 600

/**
 * Row/tablet highlighting and untwist mode are saved PER pattern AND user
 * (see PatternHighlightSettingsCard) - unlike the global display options
 * (DisplaySettingsContext), hence its own hook bound to
 * `patternDocumentId` instead of being part of the shared context. Without
 * login or a saved pattern (e.g. a not-yet-saved new one), everything
 * stays local/ephemeral - `canSave` tells the card to show the save
 * toggle disabled with an explanatory tooltip. `saveEnabled` starts off by
 * default and turns on automatically on load if a saved preference exists.
 */
export function usePatternHighlightSettings(patternDocumentId: string | null | undefined, token: string | null) {
  const [settings, setSettingsState] = useState<PatternHighlightSettings>(DEFAULT_PATTERN_HIGHLIGHT_SETTINGS)
  const [saveEnabled, setSaveEnabledState] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canSave = Boolean(patternDocumentId && token)

  useEffect(() => {
    if (!patternDocumentId || !token) {
      setSettingsState(DEFAULT_PATTERN_HIGHLIGHT_SETTINGS)
      setSaveEnabledState(false)
      return
    }
    let cancelled = false
    fetchPatternHighlightSettings(patternDocumentId, token)
      .then((saved) => {
        if (cancelled) return
        if (saved) {
          setSettingsState(saved)
          setSaveEnabledState(true)
        } else {
          setSettingsState(DEFAULT_PATTERN_HIGHLIGHT_SETTINGS)
          setSaveEnabledState(false)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [patternDocumentId, token])

  function setSettings(next: PatternHighlightSettings) {
    setSettingsState(next)
    if (!saveEnabled || !canSave) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savePatternHighlightSettings(patternDocumentId as string, next, token as string).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  function setSaveEnabled(next: boolean) {
    setSaveEnabledState(next)
    if (!canSave) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (next) {
      savePatternHighlightSettings(patternDocumentId as string, settings, token as string).catch(() => {})
    } else {
      deletePatternHighlightSettings(patternDocumentId as string, token as string).catch(() => {})
    }
  }

  return { settings, setSettings, saveEnabled, setSaveEnabled, canSave }
}
