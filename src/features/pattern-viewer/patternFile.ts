import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { hasDirectionChange } from './render/twist'
import type { TranslationKey } from '@/features/i18n/translations'
import type { PaletteSlot, Pattern, TabletThreading, ThreadingHole, TurnValue } from './types'

const FORMAT_VERSION = 1

/**
 * Portable pattern file shape: just the editable content (threading, turns,
 * colors, ...), not server/instance metadata like id, author or remix
 * lineage - those don't make sense outside the app they came from.
 */
export interface PatternFile {
  formatVersion: number
  title: string
  holesPerTablet: number
  threading: TabletThreading[]
  turningSequence: TurnValue[][]
  defaultPalette: PaletteSlot[]
  style: string[]
  notes: string
  sourceUrl: string
  repeatFromRow: number | null
  weftColorSlotId: string | null
  twistExemptTablets: number[]
}

function toPatternFile(pattern: Pattern): PatternFile {
  return {
    formatVersion: FORMAT_VERSION,
    title: pattern.title,
    holesPerTablet: pattern.holesPerTablet,
    threading: pattern.threading,
    turningSequence: pattern.turningSequence,
    defaultPalette: pattern.defaultPalette,
    style: pattern.style,
    notes: pattern.notes,
    sourceUrl: pattern.sourceUrl,
    repeatFromRow: pattern.repeatFromRow,
    weftColorSlotId: pattern.weftColorSlotId,
    twistExemptTablets: pattern.twistExemptTablets,
  }
}

function toFilenameSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'muster'
}

/** Downloads the pattern as a .json file the user can re-import later or share. */
export function downloadPatternFile(pattern: Pattern) {
  const blob = new Blob([JSON.stringify(toPatternFile(pattern), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${toFilenameSlug(pattern.title)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Downloads several patterns as a single .zip file, one .json entry per
 * pattern (each in the exact format downloadPatternFile/parsePatternFile
 * already use) - see parsePatternFileBundle for the matching bulk-import
 * side.
 */
export function downloadPatternFileBundle(patterns: Pattern[]) {
  const usedNames = new Set<string>()
  const entries: Record<string, Uint8Array> = {}
  for (const pattern of patterns) {
    const base = toFilenameSlug(pattern.title)
    let name = `${base}.json`
    for (let i = 2; usedNames.has(name); i++) name = `${base}-${i}.json`
    usedNames.add(name)
    entries[name] = strToU8(JSON.stringify(toPatternFile(pattern), null, 2))
  }

  const blob = new Blob([zipSync(entries)], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `muster-export-${patterns.length}.zip`
  link.click()
  URL.revokeObjectURL(url)
}

/** Thrown by parseAnyPatternFile; `messageKey` is a translation key, not user-facing text directly. */
export class PatternFileError extends Error {
  readonly messageKey: TranslationKey

  constructor(messageKey: TranslationKey) {
    super(messageKey)
    this.messageKey = messageKey
  }
}

function isTabletThreading(value: unknown, holesPerTablet: number): value is TabletThreading {
  if (!value || typeof value !== 'object') return false
  const tablet = value as Record<string, unknown>
  return (
    Array.isArray(tablet.holes) &&
    tablet.holes.length === holesPerTablet &&
    tablet.holes.every((hole) => hole && typeof (hole as Record<string, unknown>).colorSlotId === 'string') &&
    (tablet.orientation === 'S' || tablet.orientation === 'Z')
  )
}

/** Validates a single already-JSON-parsed pattern entry - shared by both branches of parseAnyPatternFile. */
function parsePatternFileEntry(raw: unknown): PatternFile {
  if (!raw || typeof raw !== 'object') throw new PatternFileError('patternFileInvalidFormat')
  const data = raw as Record<string, unknown>

  const holesPerTablet = typeof data.holesPerTablet === 'number' ? data.holesPerTablet : NaN
  const threading = Array.isArray(data.threading) ? data.threading : []
  const threadingValid = threading.length > 0 && threading.every((tablet) => isTabletThreading(tablet, holesPerTablet))
  const turningSequenceValid =
    Array.isArray(data.turningSequence) &&
    data.turningSequence.length > 0 &&
    data.turningSequence.every((row) => Array.isArray(row) && row.length === threading.length)

  if (!threadingValid || !turningSequenceValid) throw new PatternFileError('patternFileInvalidFormat')

  return {
    formatVersion: typeof data.formatVersion === 'number' ? data.formatVersion : 1,
    title: typeof data.title === 'string' ? data.title : '',
    holesPerTablet,
    threading: data.threading as TabletThreading[],
    turningSequence: data.turningSequence as TurnValue[][],
    defaultPalette: Array.isArray(data.defaultPalette) ? (data.defaultPalette as PaletteSlot[]) : [],
    style: Array.isArray(data.style) ? (data.style as string[]) : [],
    notes: typeof data.notes === 'string' ? data.notes : '',
    sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : '',
    repeatFromRow: typeof data.repeatFromRow === 'number' ? data.repeatFromRow : null,
    weftColorSlotId: typeof data.weftColorSlotId === 'string' ? data.weftColorSlotId : null,
    twistExemptTablets: Array.isArray(data.twistExemptTablets)
      ? data.twistExemptTablets.filter((t): t is number => typeof t === 'number')
      : [],
  }
}

function isTwtWeavingInstructionsIndividual(
  value: unknown,
  numRows: number,
  numTablets: number,
): value is { direction: 'F' | 'B'; numberOfTurns: number }[][] {
  return (
    Array.isArray(value) &&
    value.length === numRows &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === numTablets &&
        row.every((cell) => {
          if (!cell || typeof cell !== 'object') return false
          const c = cell as Record<string, unknown>
          return (c.direction === 'F' || c.direction === 'B') && typeof c.numberOfTurns === 'number'
        }),
    )
  )
}

/**
 * Parses a Twisted Threads (twistedthreads.org) pattern export - a
 * different site's format, not this app's own (see parsePatternFileEntry
 * for that). The hole traversal and turn-direction mapping were verified
 * empirically against Twisted Threads' own weaving simulation
 * (github.com/Shelagh-Lewins/twisted-threads-2, weavingUtils.js): a full
 * 64-row x 48-tablet reference pattern's resulting band matches with 0
 * mismatches. That check has two equally valid solutions (a mirror
 * symmetry - reversing the hole order cancels out with flipping the turn
 * sign, so both reproduce the identical rendered band); this uses the one
 * confirmed against the source pattern to also match its hole lettering
 * and turn-direction convention: the threading chart's hole rows are
 * reversed (holes[k] = chart[holesPerTablet - 1 - k], i.e. Twisted
 * Threads' first row is this app's last hole/D and vice versa), and
 * Twisted Threads' "F" (forward) maps directly to this app's positive
 * turn direction. Only "individual" and "allTogether" pattern types are
 * supported - "doubleFaced", "brokenTwill" and "freehand" store compact
 * chart formats that need Twisted Threads' own (unverified here)
 * expansion algorithm to turn into per-tablet turns, so those throw
 * patternFileUnsupportedTwtType instead of guessing.
 */
function parseTwtPatternFile(raw: Record<string, unknown>): PatternFile {
  const holesPerTablet = raw['Number of holes']
  const numTablets = raw['Number of tablets']
  const numRows = raw['Number of weaving rows']
  const chart = raw['Threading chart']
  const orientations = raw['Tablet orientations']
  const palette = raw['Colour palette']

  if (
    typeof holesPerTablet !== 'number' ||
    typeof numTablets !== 'number' ||
    typeof numRows !== 'number' ||
    !Array.isArray(chart) ||
    chart.length !== holesPerTablet ||
    !chart.every((row) => Array.isArray(row) && row.length === numTablets) ||
    !Array.isArray(orientations) ||
    orientations.length !== numTablets ||
    !Array.isArray(palette) ||
    !palette.every((hex) => typeof hex === 'string')
  ) {
    throw new PatternFileError('patternFileInvalidFormat')
  }
  const chartRows = chart as unknown[][]

  const patternType = raw['Pattern type']
  const patternDesign = raw['Pattern design'] as Record<string, unknown> | undefined
  const instructions = patternDesign?.weavingInstructions

  let turningSequence: TurnValue[][]
  if (patternType === 'individual') {
    if (!isTwtWeavingInstructionsIndividual(instructions, numRows, numTablets)) {
      throw new PatternFileError('patternFileInvalidFormat')
    }
    turningSequence = instructions.map((row) =>
      row.map(({ direction, numberOfTurns }) => (direction === 'F' ? 1 : -1) * numberOfTurns),
    )
  } else if (patternType === 'allTogether') {
    if (
      !Array.isArray(instructions) ||
      instructions.length !== numRows ||
      !instructions.every((direction) => direction === 'F' || direction === 'B')
    ) {
      throw new PatternFileError('patternFileInvalidFormat')
    }
    turningSequence = instructions.map((direction) => new Array(numTablets).fill(direction === 'F' ? 1 : -1))
  } else {
    throw new PatternFileError('patternFileUnsupportedTwtType')
  }

  // -1 marks an unthreaded hole in Twisted Threads (see EMPTY_HOLE_COLOR in
  // weavingUtils.js) - not representable by this app's palette, so it gets
  // one synthetic slot instead of a dangling color reference.
  const EMPTY_SLOT_ID = 'empty'
  const usesEmptyHole = chartRows.some((row) => row.some((index) => typeof index !== 'number' || index < 0 || index >= palette.length))
  const colorSlotIdFor = (index: unknown) =>
    typeof index === 'number' && index >= 0 && index < palette.length ? `c${index}` : EMPTY_SLOT_ID

  const defaultPalette: PaletteSlot[] = palette.map((hex, i) => ({ slotId: `c${i}`, name: `Farbe ${i + 1}`, hex, order: i }))
  if (usesEmptyHole) {
    defaultPalette.push({ slotId: EMPTY_SLOT_ID, name: 'Kein Faden', hex: '#ffffff', order: palette.length })
  }

  const threading: TabletThreading[] = []
  for (let t = 0; t < numTablets; t++) {
    const holes: ThreadingHole[] = []
    for (let h = 0; h < holesPerTablet; h++) holes.push({ colorSlotId: colorSlotIdFor(chartRows[holesPerTablet - 1 - h][t]) })
    threading.push({ holes, orientation: orientations[t] === '/' ? 'Z' : 'S' })
  }

  const includeInTwist = raw['Include in twist calculations']
  const twistExemptTablets = Array.isArray(includeInTwist)
    ? includeInTwist.flatMap((included, i) => (included ? [] : [i]))
    : []

  const weftColorIndex = raw['Weft colour']
  const weftColorSlotId = typeof weftColorIndex === 'number' ? colorSlotIdFor(weftColorIndex) : null

  const notes = [raw.Description, raw['Threading notes'], raw['Weaving notes']]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('\n\n')

  return {
    formatVersion: 1,
    title: typeof raw.Name === 'string' ? raw.Name : '',
    holesPerTablet,
    threading,
    turningSequence,
    defaultPalette,
    style: [],
    notes,
    sourceUrl: 'https://twistedthreads.org/',
    repeatFromRow: null,
    weftColorSlotId,
    twistExemptTablets,
  }
}

/** Routes to the Twisted Threads parser or this app's own format, based on the "source" field. */
function parseEntry(raw: unknown): PatternFile {
  if (raw && typeof raw === 'object' && (raw as Record<string, unknown>).source === 'Twisted Threads') {
    return parseTwtPatternFile(raw as Record<string, unknown>)
  }
  return parsePatternFileEntry(raw)
}

/**
 * Parses and validates an imported pattern file, auto-detecting the
 * format: a .zip bundle (see downloadPatternFileBundle, one .json entry
 * per pattern), a single plain .json pattern file (see
 * downloadPatternFile), or a Twisted Threads .json/.twt export (see
 * parseTwtPatternFile) - either way, always returns an array (one entry
 * for a single file). Tries unzipping first; anything that isn't a
 * readable zip falls back to being parsed as one plain JSON pattern.
 * Throws PatternFileError if neither works, or if a genuine zip has no
 * recognized entries, or if ANY entry doesn't look like a pattern -
 * all-or-nothing, so a partly-broken file never silently imports half
 * its patterns.
 */
export function parseAnyPatternFile(data: Uint8Array): PatternFile[] {
  let zipEntries: Record<string, Uint8Array> | null
  try {
    zipEntries = unzipSync(data)
  } catch {
    zipEntries = null
  }

  if (zipEntries) {
    const patternEntries = Object.entries(zipEntries).filter(
      ([name]) => name.toLowerCase().endsWith('.json') || name.toLowerCase().endsWith('.twt'),
    )
    if (patternEntries.length === 0) throw new PatternFileError('patternFileInvalidFormat')
    return patternEntries.map(([, bytes]) => {
      let raw: unknown
      try {
        raw = JSON.parse(strFromU8(bytes))
      } catch {
        throw new PatternFileError('patternFileInvalidJson')
      }
      return parseEntry(raw)
    })
  }

  let raw: unknown
  try {
    raw = JSON.parse(strFromU8(data))
  } catch {
    throw new PatternFileError('patternFileInvalidJson')
  }
  return [parseEntry(raw)]
}

/**
 * Removes palette entries no hole references anymore. The weft color
 * (weftColorSlotId) always counts as used, even without a threading hole
 * referencing it.
 */
export function pruneUnusedColors(pattern: Pattern): Pattern {
  const usedSlotIds = new Set(pattern.threading.flatMap((tablet) => tablet.holes.map((hole) => hole.colorSlotId)))
  if (pattern.weftColorSlotId) usedSlotIds.add(pattern.weftColorSlotId)
  return { ...pattern, defaultPalette: pattern.defaultPalette.filter((slot) => usedSlotIds.has(slot.slotId)) }
}

/**
 * Builds a brand-new pattern from an imported file (bulk import - unlike
 * applyPatternFile, there's no existing pattern to merge onto). `id`/`slug`
 * are placeholders: createPattern (see lib/strapi/patterns.ts) never sends
 * them, Strapi assigns its own. Palette is pruned here (see
 * pruneUnusedColors) since imported files - especially from other tools
 * like Twisted Threads - commonly carry a full, mostly-unused palette.
 */
export function patternFromFile(file: PatternFile, createdBy: string): Pattern {
  return pruneUnusedColors({
    id: '',
    slug: '',
    title: file.title || 'Muster',
    summary: '',
    numTablets: file.threading.length,
    holesPerTablet: file.holesPerTablet,
    numRows: file.turningSequence.length,
    threading: file.threading,
    turningSequence: file.turningSequence,
    defaultPalette: file.defaultPalette,
    defaultNomenclatureId: null,
    createdBy,
    style: file.style,
    notes: file.notes,
    sourceUrl: file.sourceUrl,
    remixOf: null,
    repeatFromRow: file.repeatFromRow,
    weftColorSlotId: file.weftColorSlotId,
    twistExemptTablets: file.twistExemptTablets.filter(
      (t) => t >= 0 && t < file.threading.length && !hasDirectionChange(file.turningSequence, t),
    ),
  })
}
