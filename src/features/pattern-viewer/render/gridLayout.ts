import type { TabletOrientation } from '../types'

export const CELL_HEIGHT = 24
/**
 * Tablets sit much closer together than a row is tall (many threads per cm
 * vs. one turn per row) - a square cell in the turning/threading diagrams
 * (WeaveDiagram/ThreadingDiagram) stretches the pattern sideways compared
 * to the woven result. Narrower than CELL_HEIGHT on purpose.
 */
export const CELL_WIDTH = 18
export const GAP = 1
export const STEP = CELL_HEIGHT + GAP
export const STEP_X = CELL_WIDTH + GAP
export const ROW_LABEL_WIDTH = 20
export const COL_LABEL_HEIGHT = 16
export const ORIENTATION_ROW_HEIGHT = 24
export const SPACE_DELETE = 8
export const DELETE_ROW_HEIGHT = 24
export const LABEL_FONT_SIZE = 11
export const FALLBACK_COLOR = '#cccccc'
export const WEFT_HEIGHT = CELL_HEIGHT - 8

/** Shared by WeaveDiagram and ThreadingDiagram so both cell ellipses match. */
export const ELLIPSE_RX = 7
export const ELLIPSE_RY = 12
export const RIGHT_ANGLE = -30
export const LEFT_ANGLE = 30

/**
 * Threading has no turn, so there's nothing to combine orientation with
 * (unlike WeaveDiagram's angleForEffectiveDirection) - shows the tilt a
 * forward turn would produce, matching the "S orientation tilts right,
 * Z orientation tilts left" convention used there.
 */
export function angleForOrientation(orientation: TabletOrientation): number {
  return orientation === 'Z' ? LEFT_ANGLE : RIGHT_ANGLE
}