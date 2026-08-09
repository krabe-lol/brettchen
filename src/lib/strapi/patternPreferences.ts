import { strapiConfig } from './config'

export interface PatternHighlightSettings {
  highlightRow: boolean
  activeRow: number
  highlightTablet: boolean
  activeTablet: number
  untwistMode: boolean
}

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
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data
}

/** Loads the saved highlight/untwist preference for this pattern, or `null` if none is saved yet. */
export async function fetchPatternHighlightSettings(
  patternDocumentId: string,
  token: string,
): Promise<PatternHighlightSettings | null> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readJsonOrThrow(response)
  if (!data.data) return null
  const { highlightRow, activeRow, highlightTablet, activeTablet, untwistMode } = data.data
  return { highlightRow, activeRow, highlightTablet, activeTablet, untwistMode }
}

/** Creates or updates the preference (upsert) - only while "save for this pattern" is enabled. */
export async function savePatternHighlightSettings(
  patternDocumentId: string,
  settings: PatternHighlightSettings,
  token: string,
): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: settings }),
  })
  await readJsonOrThrow(response)
}

/** Removes the saved preference - called once "save for this pattern" is disabled again. */
export async function deletePatternHighlightSettings(patternDocumentId: string, token: string): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await readJsonOrThrow(response)
}
