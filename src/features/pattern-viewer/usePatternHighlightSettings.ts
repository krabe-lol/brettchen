import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_PATTERN_HIGHLIGHT_SETTINGS,
  fetchPatternHighlightSettings,
  savePatternHighlightSettings,
  type PatternHighlightSettings,
} from '@/lib/strapi/patternPreferences'

const SAVE_DEBOUNCE_MS = 600

/**
 * Row/tablet position and untwist mode are saved PER pattern AND user,
 * automatically - unlike the global display options (DisplaySettingsContext),
 * hence its own hook bound to `patternDocumentId` instead of being part of
 * the shared context. Without login or a saved pattern (e.g. a
 * not-yet-saved new one), everything stays local/ephemeral (`canSave` is
 * false). Deliberately does NOT save `highlightRow`/`highlightTablet`
 * (whether highlighting is currently switched on) - that's meant to be a
 * fresh, session-only choice each time the pattern is opened, only the
 * remembered position and untwist mode carry over.
 */
export function usePatternHighlightSettings(patternDocumentId: string | null | undefined, token: string | null) {
  const [settings, setSettingsState] = useState<PatternHighlightSettings>(DEFAULT_PATTERN_HIGHLIGHT_SETTINGS)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canSave = Boolean(patternDocumentId && token)

  /**
   * `token` is read through a ref instead of being a dependency below - the
   * background token refresh in AuthContext replaces it every ~8 minutes,
   * which would otherwise re-run the load effect and silently overwrite
   * the live highlight position (and untwistMode, causing the whole
   * diagram to flip) with the last-saved server value. Safe to read the
   * latest token without reacting to it here: this hook only ever mounts
   * after auth has already settled (see PatternDetailPage), so `token` is
   * already correct on the first render.
   */
  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    const currentToken = tokenRef.current
    if (!patternDocumentId || !currentToken) {
      setSettingsState(DEFAULT_PATTERN_HIGHLIGHT_SETTINGS)
      return
    }
    let cancelled = false
    fetchPatternHighlightSettings(patternDocumentId, currentToken)
      .then((saved) => {
        if (cancelled) return
        setSettingsState({ ...DEFAULT_PATTERN_HIGHLIGHT_SETTINGS, ...saved })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token deliberately excluded, see tokenRef comment above
  }, [patternDocumentId])

  function setSettings(next: PatternHighlightSettings) {
    const previous = settings
    setSettingsState(next)
    if (!canSave) return
    // Only the position/untwist mode is ever persisted - skip the save entirely if just the
    // highlight on/off switches changed, no point debouncing a write that would do nothing.
    const positionChanged =
      next.activeRow !== previous.activeRow ||
      next.activeTablet !== previous.activeTablet ||
      next.untwistMode !== previous.untwistMode
    if (!positionChanged) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savePatternHighlightSettings(
        patternDocumentId as string,
        { activeRow: next.activeRow, activeTablet: next.activeTablet, untwistMode: next.untwistMode },
        token as string,
      ).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  return { settings, setSettings, canSave }
}
