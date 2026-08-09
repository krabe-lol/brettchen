import type { Pattern } from '../types'

export interface ThreadCounts {
  total: number
  bySlot: Record<string, number>
}

/**
 * Zählt, wie viele Fäden (= Löcher in der Schärung) insgesamt und pro
 * Farb-Slot gebraucht werden. Löcher ohne Farbe (leerer colorSlotId, im
 * Muster als X gezeigt) zählen nirgends mit – sie sind noch keiner Farbe
 * zugeordnet.
 */
export function computeThreadCounts(pattern: Pick<Pattern, 'threading'>): ThreadCounts {
  const bySlot: Record<string, number> = {}
  let total = 0
  for (const tablet of pattern.threading) {
    for (const hole of tablet.holes) {
      if (!hole.colorSlotId) continue
      bySlot[hole.colorSlotId] = (bySlot[hole.colorSlotId] ?? 0) + 1
      total += 1
    }
  }
  return { total, bySlot }
}
