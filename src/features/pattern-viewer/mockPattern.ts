import { buildThreading } from './patternBuilder'
import type { Pattern, TabletOrientation } from './types'

/**
 * Platzhalter-Daten, bis der Strapi-Client angebunden ist.
 *
 * Schären als kompaktes Raster: von oben (Loch D) nach unten (Loch A),
 * eine Spalte pro Brettchen – entspricht optisch genau der
 * Schärpatrone. Letzte Zeile: Kartenstellung (S/Z) pro Brettchen.
 */
const numTablets = 9
const numRows = 20

// prettier-ignore
// const threadingGrid = [
//   ['A', 'A', 'B', 'A', 'C', 'C', 'B', 'B', 'C'], // D
//   ['A', 'B', 'B', 'B', 'C', 'B', 'B', 'C', 'C'], // C
//   ['B', 'B', 'A', 'B', 'B', 'B', 'C', 'C', 'B'], // B
//   ['B', 'A', 'A', 'A', 'B', 'C', 'C', 'B', 'B'], // A
// ]
const threadingGrid = [
  ['D', 'A', 'B', 'A', 'C', 'C', 'B', 'B', 'C'], // D
  ['C', 'B', 'B', 'B', 'C', 'B', 'B', 'C', 'C'], // C
  ['B', 'C', 'A', 'B', 'B', 'B', 'C', 'C', 'B'], // B
  ['A', 'D', 'A', 'A', 'B', 'C', 'C', 'B', 'B'], // A
]
const orientationRow: TabletOrientation[] = ['Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z']

export const mockPattern: Pattern = {
  id: '1',
  slug: 'beispielmuster',
  title: 'Testmuster (komplex)',
  summary: 'Platzhalter, bis Strapi angebunden ist.',
  numTablets,
  holesPerTablet: 4,
  numRows,
  threading: buildThreading(threadingGrid, orientationRow),
  turningSequence: Array.from({ length: numRows }, () => Array.from({ length: numTablets }, () => 1)),
  defaultPalette: [
    { slotId: 'A', name: 'Indigo', hex: '#2f4a6b', order: 0 },
    { slotId: 'B', name: 'Naturweiß', hex: '#f2ece1', order: 1 },
    { slotId: 'C', name: 'Rostrot', hex: '#b3552f', order: 2 },
    { slotId: 'D', name: 'Dunkelgrün', hex: '#2e5d3c', order: 3 },
  ],
  defaultNomenclatureId: null,
  createdBy: 'weberin_test',
  style: ['Keltisch'],
  notes: 'Testmuster mit drei Farben, gemischten Kartenausrichtungen und durchgängig vorwärts drehenden Brettchen.',
  sourceUrl: '',
  remixOf: null,
  repeatFromRow: null,
  weftColorSlotId: null,
}
