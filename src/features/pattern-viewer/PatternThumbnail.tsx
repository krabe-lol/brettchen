import { computeDisplayWeaveGrid, type WeaveCell } from './render/weaveGrid'
import { CELL, FALLBACK_COLOR, STEP } from './render/gridLayout'
import type { Pattern, PaletteSlot } from './types'

interface PatternThumbnailProps {
  pattern: Pick<Pattern, 'title' | 'threading' | 'turningSequence' | 'numTablets' | 'numRows' | 'repeatFromRow'>
  palette: PaletteSlot[]
  className?: string
}

/**
 * Cell corner points as a parallelogram (straight vertical sides, slanted
 * 45°/135° top/bottom edges, two rows tall), or a triangle at a direction
 * change (the blunt top corner drops out) - same geometry as
 * WovenBandDiagram, see there for the derivation.
 */
function cellPoints(cell: WeaveCell, previousTurn: number | undefined, cx: number, cy: number): string {
  const xLeft = cx - CELL / 2
  const xRight = cx + CELL / 2

  if (cell.effectiveDirection === 0) {
    const yTop = cy - STEP / 2
    const yBottom = cy + STEP / 2
    return `${xLeft},${yTop} ${xRight},${yTop} ${xRight},${yBottom} ${xLeft},${yBottom}`
  }

  const leaningLeft = cell.effectiveDirection > 0
  const yTopExtreme = cy - STEP
  const yBottomExtreme = cy + STEP
  const yTopShoulder = yTopExtreme + CELL
  const yBottomShoulder = yBottomExtreme - CELL

  const topLeft = leaningLeft ? yTopShoulder : yTopExtreme
  const topRight = leaningLeft ? yTopExtreme : yTopShoulder
  const bottomLeft = leaningLeft ? yBottomExtreme : yBottomShoulder
  const bottomRight = leaningLeft ? yBottomShoulder : yBottomExtreme

  const isDirectionChange = previousTurn !== undefined && Math.sign(previousTurn) !== Math.sign(cell.turn)
  if (isDirectionChange) {
    const sharpX = leaningLeft ? xRight : xLeft
    const otherX = leaningLeft ? xLeft : xRight
    return `${sharpX},${yBottomExtreme} ${sharpX},${yTopExtreme} ${otherX},${yBottomShoulder}`
  }

  return `${xLeft},${topLeft} ${xRight},${topRight} ${xRight},${bottomRight} ${xLeft},${bottomLeft}`
}

/** Target aspect ratio of the preview (card width:height) - determines how many rows are needed at minimum so "slice" never shows an empty edge. */
const TARGET_ASPECT = 3

/**
 * Compact preview of the woven pattern (not the threading chart) - the
 * exact same computed band as WovenBandDiagram (including repetition from
 * `repeatFromRow`, see computeDisplayWeaveGrid), just without
 * labels/background areas/clickability. Rotated -90° (patterns are
 * usually narrow/long - few tablets, many rows - rotating fills the wide
 * card better). The pattern's width (tablet count, in its original
 * orientation) always fills the preview's full height exactly - never
 * cropped; if the pattern (in rows) is too short to fill the preview
 * horizontally, it repeats like in WovenBandDiagram.
 */
export function PatternThumbnail({ pattern, palette, className }: PatternThumbnailProps) {
  const colorBySlot = new Map(palette.map((slot) => [slot.slotId, slot.hex]))

  const minDisplayRows = Math.max(40, pattern.numTablets * TARGET_ASPECT)
  const weaveGrid = computeDisplayWeaveGrid(pattern, minDisplayRows)
  const displayNumRows = weaveGrid.length

  const contentWidth = pattern.numTablets * STEP
  const contentHeight = displayNumRows * STEP
  const rowY = (rowIndex: number) => (displayNumRows - 1 - rowIndex) * STEP

  return (
    <svg
      role="img"
      aria-label={pattern.title}
      viewBox={`0 0 ${contentHeight} ${contentWidth}`}
      preserveAspectRatio="xMinYMid slice"
      className={className}
    >
      <g transform={`translate(0, ${contentWidth}) rotate(-90)`}>
        {weaveGrid.map((row) =>
          row.map((cell) => {
            const cx = cell.tabletIndex * STEP + CELL / 2
            const cy = rowY(cell.rowIndex) + CELL / 2
            const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
            return (
              <polygon
                key={`${cell.rowIndex}-${cell.tabletIndex}`}
                points={cellPoints(cell, previousTurn, cx, cy)}
                fill={colorBySlot.get(cell.colorSlotId) ?? FALLBACK_COLOR}
              />
            )
          }),
        )}
      </g>
    </svg>
  )
}
