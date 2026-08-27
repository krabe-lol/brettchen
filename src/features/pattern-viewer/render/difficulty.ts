import { hasDirectionChange } from './twist'
import type { Pattern } from '../types'

export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * Tablet count contributes to the score alongside median blocks (see
 * computeDifficulty), at a quarter of a block's weight - a wider band
 * takes more concentration to weave even at otherwise-trivial turning
 * complexity, so it can push a pattern from easy to medium (or, at
 * unusually large widths, medium to hard) on its own.
 */
const TABLET_COUNT_WEIGHT = 1 / 4

/**
 * Score (median blocks + tablet-count contribution) at or below which a
 * pattern with fully synchronized/no reversals still counts as easy -
 * above it, tablet count alone makes it medium. Score above which a
 * pattern counts as hard instead of medium. Both calibrated against every
 * real pattern in the database: the busiest single row (max instead of
 * median blocks) turned out not to discriminate at all - Hallstatt 123
 * (medium) and Sulawesi Leaves 24 Cards (hard) both briefly spike to
 * ~9-10 blocks in their worst row, while the median cleanly separates
 * them (5 vs. 8). Adding the tablet-count term required doubling the old
 * bare-blocks hard threshold (5) to 10 to keep that median-based split
 * intact (Hallstatt 123 at 19 tablets already scores 9.75 from tablet
 * count alone) - the easy threshold (4) is the values above the widest
 * genuinely-easy pattern (Angrboda, 11 tablets, 3.75) and below the two
 * real patterns this change is meant to reclassify (Geometric Belt, 20
 * tablets, 5.00; So many chevrons, 24 tablets, 6.00 - both otherwise
 * trivial one-direction/synchronized bands, previously easy).
 */
const EASY_SCORE_THRESHOLD = 4
const HARD_SCORE_THRESHOLD = 10

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
 * just keeps turning the same way, framing the actual pattern). Two
 * factors combine into one score: how many distinct direction "blocks"
 * (contiguous runs of tablets turning the same way) appear across the
 * pattern tablets in a typical row (the median across all rows - a
 * traveling wave splits most rows into just a couple of blocks even
 * though every tablet reverses at its own offset, while a densely,
 * independently alternating pattern keeps many more blocks going
 * throughout, not just in one busy row), plus tablet count at a quarter
 * of that weight (see TABLET_COUNT_WEIGHT).
 * - easy: no remaining tablet ever reverses (the whole pattern just
 *   spirals), or all of them reverse on exactly the same rows (fully
 *   synchronized - chevrons/diamonds included, you only ever watch one
 *   signal for the whole pattern, regardless of how often it changes) -
 *   AND the score doesn't already exceed EASY_SCORE_THRESHOLD from tablet
 *   count alone (a wide-but-trivial band still isn't "easy" to weave);
 * - medium/hard otherwise, split by whether the score exceeds
 *   HARD_SCORE_THRESHOLD.
 */
export function computeDifficulty(pattern: Pick<Pattern, 'threading' | 'turningSequence'>): Difficulty {
  const numTablets = pattern.threading.length
  const patternTablets = Array.from({ length: numTablets }, (_, i) => i).filter((i) =>
    hasDirectionChange(pattern.turningSequence, i),
  )

  const isSynchronized =
    patternTablets.length === 0 ||
    (() => {
      const signatures = patternTablets.map((tabletIndex) => reversalRows(pattern.turningSequence, tabletIndex))
      return signatures.every((rows) => sameRows(rows, signatures[0]))
    })()

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
  const medianBlocks = [...blockCounts].sort((a, b) => a - b)[Math.floor(blockCounts.length / 2)] ?? 0
  const score = medianBlocks + numTablets * TABLET_COUNT_WEIGHT

  if (isSynchronized) return score <= EASY_SCORE_THRESHOLD ? 'easy' : 'medium'
  return score > HARD_SCORE_THRESHOLD ? 'hard' : 'medium'
}
