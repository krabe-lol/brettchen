/**
 * Canonical, nomenclature-independent pattern data - mirrors the Strapi
 * "pattern" content type. Color and turn display are deliberately NOT part
 * of these types, see PaletteOverride/NomenclatureSet.
 */

export type TabletOrientation = 'S' | 'Z'

export interface ThreadingHole {
  /** References a color slot in Pattern.defaultPalette / PaletteOverride. */
  colorSlotId: string
}

export interface TabletThreading {
  holes: ThreadingHole[]
  orientation: TabletOrientation
}

/**
 * Signed number of quarter turns per tablet and row.
 * +1 = one quarter turn forward, -2 = two turns backward, 0 = idle.
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
  /** Username of the person who submitted the pattern. */
  createdBy: string
  /** Free-form style tags, e.g. ["Celtic", "Baltic"]. */
  style: string[]
  /** Free-text notes about the pattern. */
  notes: string
  /** Optional link to the pattern's source (e.g. the original publication). */
  sourceUrl: string
  /** Set if this pattern is a remix of another one - until the link breaks from enough divergence. */
  remixOf: { title: string; slug: string } | null
  /** ISO creation timestamp; absent for a new, not-yet-saved pattern. */
  createdAt?: string
  /**
   * Optional 1-based row number where the turning sequence starts repeating
   * (e.g. for a pattern with a non-repeating intro section). `null` means
   * the whole turning sequence repeats from row 1, see WovenBandDiagram.
   */
  repeatFromRow: number | null
  /**
   * Weft color slot, optional. Counts as used even if no threading hole
   * references it - see pruneUnusedColors in PatternEditor.tsx.
   */
  weftColorSlotId: string | null
  /**
   * Tablet indices excluded from the twist-neutrality check (see
   * hasDirectionChange/isTwistNeutral in render/twist.ts) - only ever set
   * for a tablet that hasn't changed turn direction yet, typically a
   * border tablet meant to just keep turning the same way. Set by
   * clicking its twist counter in the turning diagram; once set, its
   * cells stop reacting to edits so it can't accidentally change direction.
   */
  twistExemptTablets: number[]
}

/** Client-side override of the default colors, never persisted. */
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
