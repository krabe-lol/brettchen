/**
 * Kanonische, nomenklatur-unabhängige Musterdaten – spiegelt den Strapi
 * Content-Type "pattern". Farb- und Wende-Darstellung sind bewusst NICHT
 * Teil dieser Typen, siehe PaletteOverride/NomenclatureSet.
 */

export type TabletOrientation = 'S' | 'Z'

export interface ThreadingHole {
  /** Referenz auf einen Farb-Slot in Pattern.defaultPalette / PaletteOverride */
  colorSlotId: string
}

export interface TabletThreading {
  holes: ThreadingHole[]
  orientation: TabletOrientation
}

/**
 * Vorzeichenbehaftete Anzahl Viertelumdrehungen pro Brettchen und Reihe.
 * +1 = eine Vierteldrehung vorwärts, -2 = zwei rückwärts, 0 = Idle.
 */
export type TurnValue = number

export interface PaletteSlot {
  slotId: string
  name: string
  hex: string
  order: number
}

export interface Pattern {
  id: string
  slug: string
  title: string
  summary: string
  numTablets: number
  holesPerTablet: number
  numRows: number
  threading: TabletThreading[]
  /** [row][tablet] */
  turningSequence: TurnValue[][]
  defaultPalette: PaletteSlot[]
  defaultNomenclatureId: string | null
  /** Username der Person, die das Muster eingereicht hat. */
  createdBy: string
  /** Freie Stil-Tags, z. B. ["Keltisch", "Baltisch"]. */
  style: string[]
  /** Freitext-Beschreibung/Notizen zum Muster. */
  notes: string
  /** Optionaler Link zur Quelle des Musters (z. B. Originalveröffentlichung). */
  sourceUrl: string
  /** Gesetzt, wenn dieses Muster ein Remix eines anderen Musters ist – solange sich der Link nicht durch genug Änderung gelöst hat. */
  remixOf: { title: string; slug: string } | null
  /** ISO-Zeitstempel der Erstellung; fehlt bei einem noch nicht gespeicherten neuen Muster. */
  createdAt?: string
  /**
   * Optionale 1-basierte Reihennummer, ab der sich das Drehmuster wiederholt
   * (z. B. bei einem Muster mit nicht wiederholtem Anfangsstück). `null`
   * bedeutet: das gesamte Drehmuster ab Reihe 1 wiederholt sich, siehe
   * WovenBandDiagram.
   */
  repeatFromRow: number | null
  /**
   * Farb-Slot des Schussfadens (Weft), optional. Gilt als benutzt, auch wenn
   * kein Loch der Schärung diese Farbe referenziert – siehe pruneUnusedColors
   * in PatternEditor.tsx.
   */
  weftColorSlotId: string | null
}

/** Client-seitiger Override der Standardfarben, nie persistiert. */
export type PaletteOverride = Record<string /* slotId */, string /* hex */>

export type TurnCategory = 'forward' | 'backward' | 'idle'

export interface TurnLabel {
  category: TurnCategory
  label: string
  symbol: string
}

export type HoleId = 'A' | 'B' | 'C' | 'D'

export interface HoleLabel {
  holeId: HoleId
  label: string
}

export interface OrientationLabel {
  orientation: TabletOrientation
  label: string
  symbol: string
}

export type MagnitudeDisplay = 'suffix_number' | 'repeated_symbol' | 'superscript'

export interface NomenclatureSet {
  id: string
  slug: string
  name: string
  isDefault: boolean
  turnLabels: TurnLabel[]
  holeLabels: HoleLabel[]
  orientationLabels: OrientationLabel[]
  magnitudeDisplay: MagnitudeDisplay
}
