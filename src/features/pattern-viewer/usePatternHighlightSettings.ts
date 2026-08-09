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
 * Reihen-/Brettchen-Hervorhebung und Untwist-Modus sind PRO Muster UND
 * Nutzer:in gespeichert (siehe PatternHighlightSettingsCard) – anders als
 * die globalen Anzeigeoptionen (DisplaySettingsContext), daher ein eigener,
 * an `patternDocumentId` gebundener Hook statt Teil des gemeinsamen
 * Contexts. Ohne Login oder ohne bereits gespeichertes Muster (z. B. eine
 * noch nicht gespeicherte Neuanlage) bleibt alles rein lokal/ephemer –
 * `canSave` zeigt das der Card an, damit sie den Speichern-Schalter
 * deaktiviert mit erklärendem Tooltip zeigt. `saveEnabled` startet aus
 * (Standard) und wird beim Laden automatisch eingeschaltet, wenn bereits
 * eine gespeicherte Präferenz existiert.
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
