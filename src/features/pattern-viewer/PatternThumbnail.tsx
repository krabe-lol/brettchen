import { computeDisplayWeaveGrid, type WeaveCell } from './render/weaveGrid'
import { CELL_HEIGHT, CELL_WIDTH, FALLBACK_COLOR, STEP, STEP_X } from './render/gridLayout'
import type { Pattern, PaletteSlot } from './types'

interface PatternThumbnailProps {
  pattern: Pick<Pattern, 'title' | 'threading' | 'turningSequence' | 'numTablets' | 'numRows' | 'repeatFromRow'>
  palette: PaletteSlot[]
  /** Separate prop (not part of `pattern`) since Strapi records name this field `weftColorSlot`, not `weftColorSlotId`. */
  weftColorSlotId: string | null
  className?: string
}

/**
 * Cell corner points as a parallelogram (straight vertical sides, two
 * CELL_HEIGHTs tall, diagonal top/bottom edges - the corner-to-corner
 * diagonal of one CELL_WIDTH x CELL_HEIGHT cell), or a triangle at a
 * direction change (the blunt top corner drops out) - same geometry as
 * WovenBandDiagram, see there for the derivation.
 */
function cellPoints(cell: WeaveCell, previousTurn: number | undefined, cx: number, cy: number): string {
  const xLeft = cx - CELL_WIDTH / 2
  const xRight = cx + CELL_WIDTH / 2

  if (cell.effectiveDirection === 0) {
    const yTop = cy - STEP / 2
    const yBottom = cy + STEP / 2
    return `${xLeft},${yTop} ${xRight},${yTop} ${xRight},${yBottom} ${xLeft},${yBottom}`
  }

  const leaningLeft = cell.effectiveDirection > 0
  const yTopExtreme = cy - CELL_HEIGHT
  const yBottomExtreme = cy + CELL_HEIGHT
  const yTopShoulder = yTopExtreme + CELL_HEIGHT
  const yBottomShoulder = yBottomExtreme - CELL_HEIGHT

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
 * horizontally, it repeats like in WovenBandDiagram. Unthreaded cells
 * show no polygon at all, letting a weft-colored background through
 * (same as WovenBandDiagram) instead of the gray fallback color.
 */
export function PatternThumbnail({ pattern, palette, weftColorSlotId, className }: PatternThumbnailProps) {
  const colorBySlot = new Map(palette.map((slot) => [slot.slotId, slot.hex]))
  const weftHex = (weftColorSlotId ? colorBySlot.get(weftColorSlotId) : undefined) ?? palette[0]?.hex ?? FALLBACK_COLOR

  const minDisplayRows = Math.max(40, pattern.numTablets * TARGET_ASPECT)
  const weaveGrid = computeDisplayWeaveGrid(pattern, minDisplayRows)
  const displayNumRows = weaveGrid.length

  const contentWidth = pattern.numTablets * STEP_X
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
      {/*
        Shifted left by one row (STEP): without this, the row that lands
        exactly on the crop edge (see preserveAspectRatio "slice" below)
        has its diagonal parallelogram sliced mid-shape, looking like a
        torn/irregular edge right where the thumbnail "starts" visually.
        Shifting by one row pushes that torn row out of view and brings
        the next, cleanly-bounded row to the edge instead.
      */}
      <g transform={`translate(${-STEP}, ${contentWidth}) rotate(-90)`}>
        <rect x={0} y={0} width={contentWidth} height={contentHeight} fill={weftHex} />
        {weaveGrid.map((row) =>
          row.map((cell) => {
            if (!colorBySlot.has(cell.colorSlotId)) return null

            const cx = cell.tabletIndex * STEP_X + CELL_WIDTH / 2
            const cy = rowY(cell.rowIndex) + CELL_HEIGHT / 2
            const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
            return (
              <polygon
                key={`${cell.rowIndex}-${cell.tabletIndex}`}
                points={cellPoints(cell, previousTurn, cx, cy)}
                fill={colorBySlot.get(cell.colorSlotId)}
              />
            )
          }),
        )}
      </g>
    </svg>
  )
}
