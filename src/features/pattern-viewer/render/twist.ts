import type { Pattern } from '../types'

/** Verdrillung pro Brettchen: +1 je Vorwärts-, -1 je Rückwärtsdrehung, aufsummiert über alle Reihen. */
export function computeTwistByTablet(pattern: Pick<Pattern, 'numTablets' | 'turningSequence'>): number[] {
  return Array.from({ length: pattern.numTablets }, (_, tabletIndex) =>
    pattern.turningSequence.reduce((sum, row) => sum + row[tabletIndex], 0),
  )
}

/** Ein Muster ist twist-neutral, wenn sich die Verdrillung bei jedem Brettchen zu 0 aufhebt. */
export function isTwistNeutral(pattern: Pick<Pattern, 'numTablets' | 'turningSequence'>): boolean {
  return computeTwistByTablet(pattern).every((twist) => twist === 0)
}
