import type { Pattern, TurnValue } from '../types'

export interface WeaveCell {
  tabletIndex: number
  rowIndex: number
  colorSlotId: string
  /**
   * The color visible on the BACK of the band at this same row/tablet -
   * the hole diagonally opposite `colorSlotId`'s hole on the card (same
   * rotational moment, opposite face). See WovenBandDiagram's back view.
   */
  backColorSlotId: string
  turn: TurnValue
  /**
   * Sign of the actual movement through the hole sequence (threading x
   * turn): -1/+1, or 0 when idle. This is the combined result of card
   * orientation AND the turn command - not the same as `turn` alone.
   */
  effectiveDirection: -1 | 0 | 1
}

/**
 * Reverses row order and inverts every turn - for the "untwist" display
 * mode (see DisplaySettings.untwistMode): shows the pattern the way it
 * plays out when weaving backward to remove twist (last-woven row first,
 * every turn in the opposite direction). Display-only, never changes the
 * saved pattern.
 */
export function applyUntwistOrder(pattern: Pattern): Pattern {
  return {
    ...pattern,
    turningSequence: [...pattern.turningSequence].reverse().map((row) => row.map((turn) => -turn)),
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function sign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1
  if (n < 0) return -1
  return 0
}

/**
 * Computes which threading color is visible per row and tablet.
 *
 * Row 1 is a special case: it starts fresh at whichever end of the hole
 * sequence matches the direction of the first turn - hole A if row 1 turns
 * forward, hole D if it turns backward.
 *
 * From row 2 on: a direction change (this row turns the other way than the
 * previous one) means the same color as the previous row is turned once
 * more (the card "reverses in place"), and the hole sequence then continues
 * in the new direction. Without a direction change, the hole sequence just
 * continues in the same direction as before.
 *
 * The color sequence does NOT depend on `orientation` (S/Z): given
 * identical threading and turning sequence, an S- and a Z-oriented tablet
 * show the same color sequence. `orientation` only affects
 * `effectiveDirection` - i.e. how the ellipse is drawn tilted, not which
 * color it shows.
 *
 * `backColorSlotId` is the hole diagonally opposite the front-facing one
 * (+half the hole count, wrapped) - geometrically the hole on the other
 * side of the card at that same rotational moment, since a card is a flat
 * square rotating about the thread axis: the point 180° around is the one
 * facing the opposite direction.
 */
export function computeWeaveGrid(pattern: Pick<Pattern, 'threading' | 'turningSequence'>): WeaveCell[][] {
  const faceIndex = pattern.threading.map((tablet, tabletIndex) => {
    const holeCount = tablet.holes.length || 1
    const firstTurn = pattern.turningSequence[0]?.[tabletIndex] ?? 0
    return sign(firstTurn) < 0 ? holeCount - 1 : 0
  })

  return pattern.turningSequence.map((row, rowIndex) =>
    row.map((turn, tabletIndex) => {
      const tablet = pattern.threading[tabletIndex]
      const holeCount = tablet.holes.length || 1
      const colorSlotId = tablet.holes[faceIndex[tabletIndex]]?.colorSlotId ?? ''
      const backColorSlotId = tablet.holes[mod(faceIndex[tabletIndex] + Math.floor(holeCount / 2), holeCount)]?.colorSlotId ?? ''
      const direction = tablet.orientation === 'Z' ? 1 : -1

      const nextTurn = pattern.turningSequence[rowIndex + 1]?.[tabletIndex]
      const isTurnaround = sign(turn) !== 0 && nextTurn !== undefined && sign(nextTurn) !== sign(turn)
      const appliedStep = isTurnaround ? 0 : turn

      faceIndex[tabletIndex] = mod(faceIndex[tabletIndex] + appliedStep, holeCount)
      return { tabletIndex, rowIndex, colorSlotId, backColorSlotId, turn, effectiveDirection: sign(direction * turn) }
    }),
  )
}

/**
 * Like `computeWeaveGrid`, but repeated at least once - always, not just
 * when the pattern would otherwise be too short - and more often only if
 * that's still not enough to fill a band preview of at least
 * `minDisplayRows` rows (see WovenBandDiagram/PatternThumbnail). If
 * `repeatFromRow` is set (1-based), everything before it (the "lead-in")
 * appears once, and only the unit from that row on repeats; without
 * `repeatFromRow`, the whole pattern repeats (no lead-in).
 *
 * Each repeat is an EXACT copy of the unit's once-computed cells, not
 * recomputed: `computeWeaveGrid` carries the hole position forward across
 * the whole sequence it's given - simply concatenating the raw turn values
 * and recomputing them as one long sequence would let the hole position
 * slowly drift from repeat to repeat whenever the unit itself isn't
 * twist-neutral, so each copy would look different instead of repeating
 * identically.
 */
export function computeDisplayWeaveGrid(
  pattern: Pick<Pattern, 'threading' | 'turningSequence' | 'numRows' | 'repeatFromRow'>,
  minDisplayRows: number,
): WeaveCell[][] {
  const repeatStartIndex = pattern.repeatFromRow
    ? Math.min(Math.max(pattern.repeatFromRow - 1, 0), Math.max(pattern.numRows - 1, 0))
    : 0
  const leadInRows = pattern.turningSequence.slice(0, repeatStartIndex)
  const repeatingUnit = pattern.turningSequence.slice(repeatStartIndex)
  const repeatCount =
    repeatingUnit.length > 0
      ? Math.max(2, Math.ceil((minDisplayRows - leadInRows.length) / repeatingUnit.length))
      : 1

  const singlePassGrid = computeWeaveGrid({
    threading: pattern.threading,
    turningSequence: [...leadInRows, ...repeatingUnit],
  })
  const unitTemplate = singlePassGrid.slice(leadInRows.length)

  const weaveGrid: WeaveCell[][] = [...singlePassGrid]
  for (let copy = 1; copy < repeatCount; copy++) {
    const rowOffset = leadInRows.length + copy * repeatingUnit.length
    unitTemplate.forEach((row, i) => {
      weaveGrid.push(row.map((cell) => ({ ...cell, rowIndex: rowOffset + i })))
    })
  }
  return weaveGrid
}
