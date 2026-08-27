import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { hasDirectionChange } from './render/twist'
import type { TranslationKey } from '@/features/i18n/translations'
import type { PaletteSlot, Pattern, TabletThreading, TurnValue } from './types'

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

/**
 * Parses and validates an imported pattern file, auto-detecting the
 * format: a .zip bundle (see downloadPatternFileBundle, one .json entry
 * per pattern) or a single plain .json pattern file (see
 * downloadPatternFile) - either way, always returns an array (one entry
 * for a single file). Tries unzipping first; anything that isn't a
 * readable zip falls back to being parsed as one plain JSON pattern.
 * Throws PatternFileError if neither works, or if a genuine zip has no
 * .json entries, or if ANY entry doesn't look like a pattern -
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
    const jsonEntries = Object.entries(zipEntries).filter(([name]) => name.toLowerCase().endsWith('.json'))
    if (jsonEntries.length === 0) throw new PatternFileError('patternFileInvalidFormat')
    return jsonEntries.map(([, bytes]) => {
      let raw: unknown
      try {
        raw = JSON.parse(strFromU8(bytes))
      } catch {
        throw new PatternFileError('patternFileInvalidJson')
      }
      return parsePatternFileEntry(raw)
    })
  }

  let raw: unknown
  try {
    raw = JSON.parse(strFromU8(data))
  } catch {
    throw new PatternFileError('patternFileInvalidJson')
  }
  return [parsePatternFileEntry(raw)]
}

/**
 * Builds a brand-new pattern from an imported file (bulk import - unlike
 * applyPatternFile, there's no existing pattern to merge onto). `id`/`slug`
 * are placeholders: createPattern (see lib/strapi/patterns.ts) never sends
 * them, Strapi assigns its own.
 */
export function patternFromFile(file: PatternFile, createdBy: string): Pattern {
  return {
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
  }
}
