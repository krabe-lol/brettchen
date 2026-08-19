import { hasDirectionChange } from './twist'
import type { Pattern } from '../types'

export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * More than this many direction "blocks" (see computeDifficulty), at the
 * median row, pushes a pattern from medium to hard. The busiest single
 * row (max instead of median) turned out not to discriminate at all when
 * checked against real patterns - Hallstatt 123 (medium) and Sulawesi
 * Leaves 24 Cards (hard) both briefly spike to ~9-10 blocks in their worst
 * row. The median cleanly separates them (5 vs. 8, matching "8 blocks" as
 * the hard example's defining trait almost exactly) since it reflects the
 * pattern's typical row instead of one outlier.
 */
const HARD_BLOCK_THRESHOLD = 5

/** Row indices where a tablet's turn direction flips - same pairwise sign comparison as hasDirectionChange. */
function reversalRows(turningSequence: number[][], tabletIndex: number): number[] {
  const rows: number[] = []
  let previousSign: number | undefined
  turningSequence.forEach((row, i) => {
    const sign = Math.sign(row[tabletIndex] ?? 0)
    if (previousSign !== undefined && sign !== previousSign) rows.push(i)
    previousSign = sign
  })
  return rows
}

function sameRows(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((row, i) => row === b[i])
}

/**
 * Difficulty to weave, ignoring "border" tablets that never reverse
 * direction (see hasDirectionChange - typically a twisted-cord edge that
 * just keeps turning the same way, framing the actual pattern):
 * - easy: no remaining tablet ever reverses (the whole pattern just
 *   spirals), or all of them reverse on exactly the same rows (fully
 *   synchronized - chevrons/diamonds included, you only ever watch one
 *   signal for the whole pattern, regardless of how often it changes);
 * - medium/hard otherwise, split by how many distinct direction "blocks"
 *   (contiguous runs of tablets turning the same way) appear across the
 *   pattern tablets in a typical row (the median across all rows). A
 *   traveling wave splits most rows into just a couple of blocks even
 *   though every tablet reverses at its own offset; a densely,
 *   independently alternating pattern keeps many more blocks going
 *   throughout, not just in one busy row.
 */
export function computeDifficulty(pattern: Pick<Pattern, 'threading' | 'turningSequence'>): Difficulty {
  const numTablets = pattern.threading.length
  const patternTablets = Array.from({ length: numTablets }, (_, i) => i).filter((i) =>
    hasDirectionChange(pattern.turningSequence, i),
  )
  if (patternTablets.length === 0) return 'easy'

  const signatures = patternTablets.map((tabletIndex) => reversalRows(pattern.turningSequence, tabletIndex))
  if (signatures.every((rows) => sameRows(rows, signatures[0]))) return 'easy'

  const blockCounts = pattern.turningSequence.map((row) => {
    let blocks = 0
    let previousSign: number | undefined
    for (const tabletIndex of patternTablets) {
      const sign = Math.sign(row[tabletIndex] ?? 0)
      if (sign !== previousSign) blocks++
      previousSign = sign
    }
    return blocks
  })
  const medianBlocks = [...blockCounts].sort((a, b) => a - b)[Math.floor(blockCounts.length / 2)]

  return medianBlocks > HARD_BLOCK_THRESHOLD ? 'hard' : 'medium'
}
