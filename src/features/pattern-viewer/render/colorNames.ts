import chroma from 'chroma-js'
import type { Language } from '@/features/i18n/translations'

interface ColorDefinition {
  hex: string
  names: Record<Language, string>
}

/** Grundfarben mit einfachen Namen, für die Schnellauswahl-Buttons im Picker. */
export const BASIC_COLOR_DEFINITIONS: ColorDefinition[] = [
  { hex: '#ffffff', names: { de: 'Weiß', en: 'White' } },
  { hex: '#808080', names: { de: 'Grau', en: 'Gray' } },
  { hex: '#161616', names: { de: 'Schwarz', en: 'Black' } },
  { hex: '#dc2626', names: { de: 'Rot', en: 'Red' } },
  { hex: '#ea580c', names: { de: 'Orange', en: 'Orange' } },
  { hex: '#eab308', names: { de: 'Gelb', en: 'Yellow' } },
  { hex: '#16a34a', names: { de: 'Grün', en: 'Green' } },
  { hex: '#2563eb', names: { de: 'Blau', en: 'Blue' } },
  { hex: '#7c3aed', names: { de: 'Violett', en: 'Violet' } },
  { hex: '#ec4899', names: { de: 'Pink', en: 'Pink' } },
]

/** Für die Schnellauswahl-Buttons im Picker, in der aktuellen Sprache. */
export function localizedBasicColors(language: Language): { name: string; hex: string }[] {
  return BASIC_COLOR_DEFINITIONS.map((color) => ({ name: color.names[language], hex: color.hex }))
}

/**
 * Ab welcher Delta-E-Distanz (CIE76) zwei Farben noch als "gleich" gelten –
 * unterhalb der Wahrnehmungsschwelle (JND liegt bei ca. 2.3), damit auch
 * Farben verhindert werden, die sich nur minimal vom Original unterscheiden.
 */
const DUPLICATE_COLOR_THRESHOLD = 8

/** Ob zwei Hex-Farben identisch oder einander so ähnlich sind, dass sie im Muster nicht zu unterscheiden wären. */
export function isSimilarColor(hexA: string, hexB: string): boolean {
  return chroma.deltaE(hexA, hexB) < DUPLICATE_COLOR_THRESHOLD
}

/**
 * Größeres Farbnamen-Vokabular für die automatische Benennung: enthält die
 * Grundfarben (gleiche Hex-Werte wie BASIC_COLOR_DEFINITIONS, damit ein Klick
 * auf eine Grundfarbe exakt ihren einfachen Namen behält) plus feinere
 * Zwischentöne für frei gewählte Farben.
 */
const EXTENDED_COLOR_DEFINITIONS: ColorDefinition[] = [
  ...BASIC_COLOR_DEFINITIONS,
  { hex: '#d1d5db', names: { de: 'Hellgrau', en: 'Light gray' } },
  { hex: '#374151', names: { de: 'Dunkelgrau', en: 'Dark gray' } },
  { hex: '#7f1d1d', names: { de: 'Dunkelrot', en: 'Dark red' } },
  { hex: '#fb923c', names: { de: 'Apricot', en: 'Apricot' } },
  { hex: '#fef08a', names: { de: 'Blassgelb', en: 'Pale yellow' } },
  { hex: '#ca8a04', names: { de: 'Senfgelb', en: 'Mustard' } },
  { hex: '#14532d', names: { de: 'Dunkelgrün', en: 'Dark green' } },
  { hex: '#86efac', names: { de: 'Hellgrün', en: 'Light green' } },
  { hex: '#14b8a6', names: { de: 'Türkis', en: 'Turquoise' } },
  { hex: '#60a5fa', names: { de: 'Hellblau', en: 'Light blue' } },
  { hex: '#1e3a8a', names: { de: 'Dunkelblau', en: 'Dark blue' } },
  { hex: '#c4b5fd', names: { de: 'Helllila', en: 'Light purple' } },
  { hex: '#78350f', names: { de: 'Braun', en: 'Brown' } },
  { hex: '#e7d8c9', names: { de: 'Beige', en: 'Beige' } },
]

/**
 * Sucht die wahrnehmungsnächste Farbdefinition per Delta-E (CIE76), derselben
 * Distanzberechnung, die auch die Bibliothek color-namer verwendet – nur auf
 * unser eigenes, zweisprachiges Namensvokabular angewendet statt auf deren
 * (rein englische) Listen.
 */
function nearestColorDefinition(hex: string): ColorDefinition {
  let best = EXTENDED_COLOR_DEFINITIONS[0]
  let bestDistance = Infinity
  for (const candidate of EXTENDED_COLOR_DEFINITIONS) {
    const distance = chroma.deltaE(hex, candidate.hex)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

/** Generiert einen innerhalb der bestehenden Namen eindeutigen Farbnamen aus einem Hex-Wert. */
export function generateColorName(hex: string, existingNames: string[], language: Language): string {
  const baseName = nearestColorDefinition(hex).names[language]
  if (!existingNames.includes(baseName)) return baseName
  let counter = 2
  while (existingNames.includes(`${baseName} ${counter}`)) counter++
  return `${baseName} ${counter}`
}
