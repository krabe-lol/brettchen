import { strapiConfig } from './config'

export interface PatternHighlightSettings {
  highlightRow: boolean
  activeRow: number
  highlightTablet: boolean
  activeTablet: number
  untwistMode: boolean
}

/** The subset that actually gets persisted - see usePatternHighlightSettings for why highlightRow/highlightTablet never do. */
export type PersistedPatternSettings = Pick<PatternHighlightSettings, 'activeRow' | 'activeTablet' | 'untwistMode'>

export const DEFAULT_PATTERN_HIGHLIGHT_SETTINGS: PatternHighlightSettings = {
  highlightRow: false,
  activeRow: 1,
  highlightTablet: false,
  activeTablet: 1,
  untwistMode: false,
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`)
  }
  return data
}

/** Loads the saved row/tablet position + untwist mode for this pattern, or `null` if none is saved yet. */
export async function fetchPatternHighlightSettings(
  patternDocumentId: string,
  token: string,
): Promise<PersistedPatternSettings | null> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readJsonOrThrow(response)
  if (!data.data) return null
  const { activeRow, activeTablet, untwistMode } = data.data
  return { activeRow, activeTablet, untwistMode }
}

/** Creates or updates the preference (upsert) - called automatically whenever the position/untwist mode changes. */
export async function savePatternHighlightSettings(
  patternDocumentId: string,
  settings: PersistedPatternSettings,
  token: string,
): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: settings }),
  })
  await readJsonOrThrow(response)
}
