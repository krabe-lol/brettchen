import { buildThreading } from './patternBuilder'
import { localizedBasicColors } from './render/colorNames'
import type { Language } from '@/features/i18n/translations'
import type { Pattern, TabletOrientation } from './types'

const NUM_TABLETS = 8
const NUM_ROWS = 24
const HOLES_PER_TABLET = 4

/** Blank starting pattern for creating a new one: 8 tablets, 24 rows, one color, all turning forward. */
export function createEmptyPattern(createdBy: string, title: string, language: Language): Pattern {
  const white = localizedBasicColors(language)[0]
  const threadingGrid = Array.from({ length: HOLES_PER_TABLET }, () =>
    Array.from({ length: NUM_TABLETS }, () => 'A'),
  )
  const orientationRow: TabletOrientation[] = Array.from({ length: NUM_TABLETS }, () => 'S')

  return {
    id: '',
    slug: '',
    title,
    summary: '',
    numTablets: NUM_TABLETS,
    holesPerTablet: HOLES_PER_TABLET,
    numRows: NUM_ROWS,
    threading: buildThreading(threadingGrid, orientationRow),
    turningSequence: Array.from({ length: NUM_ROWS }, () => Array.from({ length: NUM_TABLETS }, () => 1)),
    defaultPalette: [{ slotId: 'A', name: white.name, hex: white.hex, order: 0 }],
    defaultNomenclatureId: null,
    createdBy,
    style: [],
    notes: '',
    sourceUrl: '',
    remixOf: null,
    repeatFromRow: null,
    weftColorSlotId: null,
  }
}
