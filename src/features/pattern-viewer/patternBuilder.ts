import type { TabletOrientation, TabletThreading } from './types'

/**
 * Builds a pattern's threading from a compact, visual grid: `threadingGrid`
 * is ordered row-wise from the top hole (e.g. D) down to the bottom hole
 * (A) - exactly like the threading chart - each column is a tablet, each
 * character a color slot id. `orientationRow` assigns each tablet (one
 * column) its card orientation (S/Z).
 */
export function buildThreading(threadingGrid: string[][], orientationRow: TabletOrientation[]): TabletThreading[] {
  const holesPerTablet = threadingGrid.length
  const numTablets = orientationRow.length

  return Array.from({ length: numTablets }, (_, tabletIndex) => ({
    holes: Array.from({ length: holesPerTablet }, (_, holeIndex) => ({
      colorSlotId: threadingGrid[holesPerTablet - 1 - holeIndex][tabletIndex],
    })),
    orientation: orientationRow[tabletIndex],
  }))
}
