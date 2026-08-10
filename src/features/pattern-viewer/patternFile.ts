import type { TranslationKey } from '@/features/i18n/translations'
import type { PaletteSlot, Pattern, TabletThreading, TurnValue } from './types'

const FORMAT_VERSION = 1

/**
 * Portable pattern file shape: just the editable content (threading, turns,
 * colors, ...), not server/instance metadata like id, author or remix
 * lineage - those don't make sense outside the app they came from.
 */
interface PatternFile {
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

/** Thrown by parsePatternFile; `messageKey` is a translation key, not user-facing text directly. */
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

/** Parses and validates a previously exported pattern file. Throws PatternFileError if the file doesn't look like a pattern export. */
export function parsePatternFile(text: string): PatternFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new PatternFileError('patternFileInvalidJson')
  }
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
  }
}

/** Applies an imported file's content onto an existing pattern, keeping id/author/remix lineage etc. */
export function applyPatternFile(base: Pattern, file: PatternFile): Pattern {
  return {
    ...base,
    title: file.title || base.title,
    holesPerTablet: file.holesPerTablet,
    numTablets: file.threading.length,
    numRows: file.turningSequence.length,
    threading: file.threading,
    turningSequence: file.turningSequence,
    defaultPalette: file.defaultPalette,
    style: file.style,
    notes: file.notes,
    sourceUrl: file.sourceUrl,
    repeatFromRow: file.repeatFromRow,
    weftColorSlotId: file.weftColorSlotId,
  }
}
