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

/** Lädt die für dieses Muster gespeicherte Hervorhebungs-/Untwist-Präferenz, oder `null`, wenn (noch) keine gespeichert ist. */
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

/** Legt die Präferenz an oder aktualisiert sie (upsert) – nur solange "Für dieses Muster speichern" aktiviert ist. */
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

/** Entfernt die gespeicherte Präferenz wieder – wird aufgerufen, sobald "Für dieses Muster speichern" deaktiviert wird. */
export async function deletePatternHighlightSettings(patternDocumentId: string, token: string): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/pattern-preferences/${patternDocumentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await readJsonOrThrow(response)
}
