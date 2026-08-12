import type { Pattern } from '../types'

/** Twist per tablet: +1 per forward turn, -1 per backward turn, summed over all rows. */
export function computeTwistByTablet(pattern: Pick<Pattern, 'numTablets' | 'turningSequence'>): number[] {
  return Array.from({ length: pattern.numTablets }, (_, tabletIndex) =>
    pattern.turningSequence.reduce((sum, row) => sum + row[tabletIndex], 0),
  )
}

/**
 * Whether a tablet's turn direction ever flips across the rows - same
 * comparison as the cyan direction-change line in the turning diagram,
 * just checked across the whole column instead of a single cell. A
 * tablet only qualifies for twist exemption while this is false, i.e. it
 * has turned the same way (or stayed idle) throughout so far - typically
 * a border tablet that just keeps turning forward the whole band.
 */
export function hasDirectionChange(turningSequence: number[][], tabletIndex: number): boolean {
  for (let i = 1; i < turningSequence.length; i++) {
    if (Math.sign(turningSequence[i - 1][tabletIndex]) !== Math.sign(turningSequence[i][tabletIndex])) return true
  }
  return false
}

/**
 * A pattern is twist-neutral when the twist cancels out to 0 for every
 * tablet, except tablets explicitly marked exempt (see
 * Pattern.twistExemptTablets) - those keep turning the same way on
 * purpose (see hasDirectionChange), so their twist is expected, not a flaw.
 */
export function isTwistNeutral(
  pattern: Pick<Pattern, 'numTablets' | 'turningSequence' | 'twistExemptTablets'>,
): boolean {
  return computeTwistByTablet(pattern).every(
    (twist, tabletIndex) => twist === 0 || pattern.twistExemptTablets.includes(tabletIndex),
  )
}
