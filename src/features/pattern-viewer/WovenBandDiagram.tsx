import { useEffect, useRef } from 'react'
import { applyUntwistOrder, computeDisplayWeaveGrid } from './render/weaveGrid'
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  COL_LABEL_HEIGHT,
  FALLBACK_COLOR,
  LABEL_FONT_SIZE,
  ROW_LABEL_WIDTH,
  STEP,
  STEP_X,
  WEFT_HEIGHT,
} from './render/gridLayout'
import { useLanguage } from '@/features/i18n/LanguageContext'
import type { Pattern, PaletteSlot } from './types'

interface WovenBandDiagramProps {
  pattern: Pattern
  palette: PaletteSlot[]
  /** If set (0-based), this row is highlighted and scrolled into view on change - see PatternDiagrams navigation. */
  activeRow?: number | null
  /** Shows the band in reverse (see applyUntwistOrder) - saved per pattern/user, see usePatternHighlightSettings. */
  untwistMode?: boolean
  /** Shows a vertical guide line through the tablet centers. See DisplaySettings.showCenterLine. */
  showCenterLine?: boolean
}

/** Minimum row count in the band preview - shorter turning sequences repeat to fill it. */
const MIN_DISPLAY_ROWS = 40

/** Fixed (not theme-dependent) so the outline stays visibly grey in both light and dark mode - `--border` would nearly disappear in dark mode. */
const PARALLELOGRAM_STROKE = '#808080'

/**
 * Realistic band preview, in the same orientation as the turning diagram
 * (tablets as columns from the left, row 1 at the bottom, growing
 * upward). Instead of ellipses, each cell shows a parallelogram with
 * straight vertical sides and slanted (45°/135°) top/bottom edges - the
 * taller point sits on the side the ellipse would tilt toward in the
 * turning diagram (`effectiveDirection`). Only the row of a direction
 * change (the same turnaround point the turning diagram marks with the
 * cyan line) becomes a triangle: the blunt top corner drops out, the rows
 * before and right after stay normal parallelograms. An unthreaded hole
 * (see the "no thread" color in the editor) draws no parallelogram at
 * all, showing a background bar in the weft color through the gap
 * instead - same as in a real band, where the weft only shows through
 * where a warp thread is missing. Defaults to the first palette color
 * until a weft color is explicitly set (see WeftColorSelector). Read-only, not clickable.
 */
export function WovenBandDiagram({
  pattern,
  palette,
  activeRow = null,
  untwistMode = false,
  showCenterLine = false,
}: WovenBandDiagramProps) {
  const { t } = useLanguage()
  const colorBySlot = new Map(palette.map((slot) => [slot.slotId, slot.hex]))
  const colorOf = (slotId: string) => colorBySlot.get(slotId) ?? FALLBACK_COLOR
  const weftHex = (pattern.weftColorSlotId ? colorBySlot.get(pattern.weftColorSlotId) : undefined) ?? palette[0]?.hex ?? FALLBACK_COLOR

  const activeRowRef = useRef<SVGRectElement>(null)
  useEffect(() => {
    if (activeRow != null) activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeRow])

  const weaveGrid = computeDisplayWeaveGrid(untwistMode ? applyUntwistOrder(pattern) : pattern, MIN_DISPLAY_ROWS)
  const displayNumRows = weaveGrid.length

  const gridWidth = pattern.numTablets * STEP_X
  const gridHeight = displayNumRows * STEP
  const totalWidth = ROW_LABEL_WIDTH + gridWidth
  const totalHeight = COL_LABEL_HEIGHT + gridHeight

  /** Row 0 (woven first) at the bottom, higher rows further up - same as the turning diagram. */
  const rowY = (rowIndex: number) => COL_LABEL_HEIGHT + (displayNumRows - 1 - rowIndex) * STEP

  return (
    <svg
      role="img"
      aria-label={t('weaveBandAriaLabel', { title: pattern.title })}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      className="text-foreground"
      style={{ maxWidth: totalWidth }}
    >
      {pattern.threading.map((_, tabletIndex) => (
        <text
          key={`col-${tabletIndex}`}
          x={ROW_LABEL_WIDTH + tabletIndex * STEP_X + CELL_WIDTH / 2}
          y={COL_LABEL_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {tabletIndex + 1}
        </text>
      ))}

      {Array.from({ length: displayNumRows }, (_, rowIndex) => (
        <text
          key={`row-${rowIndex}`}
          x={ROW_LABEL_WIDTH / 2}
          y={rowY(rowIndex) + CELL_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {rowIndex + 1}
        </text>
      ))}

      {/* One bar per row, not one solid block - the small gap between them (matching the cell grid's own spacing) makes individual weft picks recognizable. */}
      {Array.from({ length: displayNumRows }, (_, rowIndex) => (
        <rect
          key={`weft-${rowIndex}`}
          x={ROW_LABEL_WIDTH - 2}
          y={rowY(rowIndex) + (CELL_HEIGHT - WEFT_HEIGHT) / 2}
          width={gridWidth + 4}
          height={WEFT_HEIGHT}
          fill={weftHex}
        />
      ))}

      {weaveGrid.map((row) =>
        row.map((cell) => {
          if (!colorBySlot.has(cell.colorSlotId)) return null

          const cx = ROW_LABEL_WIDTH + cell.tabletIndex * STEP_X + CELL_WIDTH / 2
          const cy = rowY(cell.rowIndex) + CELL_HEIGHT / 2
          const xLeft = cx - CELL_WIDTH / 2
          const xRight = cx + CELL_WIDTH / 2
          const fill = colorOf(cell.colorSlotId)

          const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
          const isDirectionChange = previousTurn !== undefined && Math.sign(previousTurn) !== Math.sign(cell.turn)

          let points: string
          if (cell.effectiveDirection === 0) {
            // No tilt: a simple, straight rectangle spanning one row.
            const yTop = cy - STEP / 2
            const yBottom = cy + STEP / 2
            points = `${xLeft},${yTop} ${xRight},${yTop} ${xRight},${yBottom} ${xLeft},${yBottom}`
          } else {
            const leaningLeft = cell.effectiveDirection > 0
            // Spans 2 * CELL_HEIGHT (48px) tip to tip - the diagonal edges are the
            // corner-to-corner diagonal of one CELL_WIDTH x CELL_HEIGHT cell (18x24,
            // hypotenuse 30), giving the acute/obtuse angles 36.87°/143.13° their
            // exact values. The shoulder offset equals CELL_HEIGHT, which lands it
            // exactly on cy - the vertical center of the 48px shape.
            const yTopExtreme = cy - CELL_HEIGHT
            const yBottomExtreme = cy + CELL_HEIGHT
            const yTopShoulder = yTopExtreme + CELL_HEIGHT
            const yBottomShoulder = yBottomExtreme - CELL_HEIGHT

            const topLeft = leaningLeft ? yTopShoulder : yTopExtreme
            const topRight = leaningLeft ? yTopExtreme : yTopShoulder
            const bottomLeft = leaningLeft ? yBottomExtreme : yBottomShoulder
            const bottomRight = leaningLeft ? yBottomShoulder : yBottomExtreme

            if (isDirectionChange) {
              // at a direction change
              const sharpBottomX = leaningLeft ? xRight : xLeft
              const sharpTopX = leaningLeft ? xRight : xLeft
              const otherX = leaningLeft ? xLeft : xRight
              points = `${sharpBottomX},${yBottomExtreme} ${sharpTopX},${yTopExtreme} ${otherX},${yBottomShoulder}`
            } else {
              points = `${xLeft},${topLeft} ${xRight},${topRight} ${xRight},${bottomRight} ${xLeft},${bottomLeft}`
            }
          }

          return (
            <polygon
              key={`${cell.rowIndex}-${cell.tabletIndex}`}
              points={points}
              fill={fill}
              stroke={PARALLELOGRAM_STROKE}
              strokeWidth={0.5}
            />
          )
        }),
      )}

      {activeRow != null && (
        <rect
          ref={activeRowRef}
          x={ROW_LABEL_WIDTH}
          y={rowY(activeRow)}
          width={gridWidth}
          height={STEP}
          rx={2}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          style={{ scrollMarginBlock: '96px' }}
          pointerEvents="none"
        />
      )}

      {showCenterLine && (
        <line
          x1={ROW_LABEL_WIDTH + gridWidth / 2}
          y1={0}
          x2={ROW_LABEL_WIDTH + gridWidth / 2}
          y2={totalHeight}
          stroke="#23C2F1"
          strokeWidth={3}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}
    </svg>
  )
}
