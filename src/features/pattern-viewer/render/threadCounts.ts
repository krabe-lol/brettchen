import type { Pattern } from '../types'

export interface ThreadCounts {
  total: number
  bySlot: Record<string, number>
}

/**
 * Counts how many threads (= holes in the threading) are needed in total
 * and per color slot. Holes without a color (empty colorSlotId, shown as X
 * in the pattern) aren't counted anywhere - they're not assigned yet.
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

/** Number of distinct colors actually threaded somewhere - an unused palette slot doesn't count. */
export function countUsedColors(pattern: Pick<Pattern, 'threading'>): number {
  return Object.keys(computeThreadCounts(pattern).bySlot).length
}
