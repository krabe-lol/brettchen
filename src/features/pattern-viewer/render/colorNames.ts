import chroma from 'chroma-js'
import type { Language } from '@/features/i18n/translations'

interface ColorDefinition {
  hex: string
  names: Record<Language, string>
}

/** Basic colors with simple names, for the quick-pick buttons in the color picker. */
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

/** For the quick-pick buttons in the color picker, in the current language. */
export function localizedBasicColors(language: Language): { name: string; hex: string }[] {
  return BASIC_COLOR_DEFINITIONS.map((color) => ({ name: color.names[language], hex: color.hex }))
}

/**
 * Delta-E distance (CIE76) below which two colors still count as "the
 * same" - well above the perceptual threshold (JND is ~2.3), so colors
 * that differ only minimally from the original get caught too.
 */
const DUPLICATE_COLOR_THRESHOLD = 8

/** Whether two hex colors are identical or similar enough to be indistinguishable in the pattern. */
export function isSimilarColor(hexA: string, hexB: string): boolean {
  return chroma.deltaE(hexA, hexB) < DUPLICATE_COLOR_THRESHOLD
}

/**
 * Larger color-name vocabulary for automatic naming: includes the basic
 * colors (same hex values as BASIC_COLOR_DEFINITIONS, so clicking one keeps
 * its exact simple name) plus finer in-between shades for freely picked colors.
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
 * Finds the perceptually closest color definition via Delta-E (CIE76), the
 * same distance metric the color-namer library uses - just applied to our
 * own bilingual name vocabulary instead of its English-only lists.
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

/** Generates a color name from a hex value that's unique among the existing names. */
export function generateColorName(hex: string, existingNames: string[], language: Language): string {
  const baseName = nearestColorDefinition(hex).names[language]
  if (!existingNames.includes(baseName)) return baseName
  let counter = 2
  while (existingNames.includes(`${baseName} ${counter}`)) counter++
  return `${baseName} ${counter}`
}
