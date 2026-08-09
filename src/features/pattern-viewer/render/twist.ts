import type { Pattern } from '../types'

/** Twist per tablet: +1 per forward turn, -1 per backward turn, summed over all rows. */
export function computeTwistByTablet(pattern: Pick<Pattern, 'numTablets' | 'turningSequence'>): number[] {
  return Array.from({ length: pattern.numTablets }, (_, tabletIndex) =>
    pattern.turningSequence.reduce((sum, row) => sum + row[tabletIndex], 0),
  )
}

/** A pattern is twist-neutral when the twist cancels out to 0 for every tablet. */
export function isTwistNeutral(pattern: Pick<Pattern, 'numTablets' | 'turningSequence'>): boolean {
  return computeTwistByTablet(pattern).every((twist) => twist === 0)
}
