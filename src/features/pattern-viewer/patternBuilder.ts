import type { TabletOrientation, TabletThreading } from './types'

/**
 * Baut das Schären eines Musters aus einem kompakten, visuellen Raster:
 * `threadingGrid` ist zeilenweise von oben (höchstes Loch, z. B. D) nach
 * unten (Loch A) angeordnet – genau wie in der Schärpatrone – jede
 * Spalte ist ein Brettchen, jedes Zeichen eine Farb-Slot-ID. `orientationRow`
 * ordnet jedem Brettchen (eine Spalte, eine Zeile) eine Kartenstellung
 * (S/Z) zu.
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
