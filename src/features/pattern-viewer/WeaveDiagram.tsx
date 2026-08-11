import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { applyUntwistOrder, computeWeaveGrid } from './render/weaveGrid'
import { computeTwistByTablet } from './render/twist'
import { CELL, COL_LABEL_HEIGHT, FALLBACK_COLOR, LABEL_FONT_SIZE, ROW_LABEL_WIDTH, STEP } from './render/gridLayout'
import { DEFAULT_DISPLAY_SETTINGS } from './render/orientationDisplay'
import { useLanguage } from '@/features/i18n/LanguageContext'
import type { DisplaySettings } from './render/orientationDisplay'
import type { Pattern, PaletteSlot, TurnValue } from './types'

interface WeaveDiagramProps {
  pattern: Pattern
  palette: PaletteSlot[]
  /** If set, cells become clickable (reverses turn direction from here on). */
  onCellClick?: (rowIndex: number, tabletIndex: number) => void
  /** If set, a button at the end of each row inverts every tablet's turn in that row. */
  onInvertRow?: (rowIndex: number) => void
  /** Display-only, never changes the saved value. See render/orientationDisplay.ts. */
  displaySettings?: DisplaySettings
  /** If set (0-based), this row is highlighted and scrolled into view on change - see PatternDiagrams navigation. */
  activeRow?: number | null
  /** Shows the turning diagram in reverse (see applyUntwistOrder) - saved per pattern/user, see usePatternHighlightSettings. */
  untwistMode?: boolean
}

const ELLIPSE_RX = 8
const ELLIPSE_RY = 13
const RIGHT_ANGLE = -40
const LEFT_ANGLE = 40

const SQUARE_SIZE = CELL

const FORWARD_BG = 'var(--background)'
const BACKWARD_BG = 'var(--foreground)'

/** Reserved column at the right for the per-row invert button. */
const INVERT_ROW_WIDTH = STEP
const INVERT_ICON_SIZE = 14

/**
 * The drag-toggle (see handleCellPointerEnter) only reacts within this
 * smaller, centered zone of a cell - a plain click still works anywhere in
 * the full cell, but grazing just the edge of a neighboring cell while
 * dragging along a row/column shouldn't also toggle it.
 */
const DRAG_HIT_INSET = 5

/** The ellipse angle shows the twist: the result of threading x turn (not the turn alone). */
function angleForEffectiveDirection(effectiveDirection: -1 | 0 | 1): number {
  if (effectiveDirection < 0) return RIGHT_ANGLE
  if (effectiveDirection > 0) return LEFT_ANGLE
  return 0
}

/**
 * Background shows the turn direction: page background = forward,
 * foreground color = backward - its opacity is adjustable via
 * `displaySettings.backwardContrast` so the contrast can suit personal preference.
 */
function backgroundForTurn(turn: TurnValue, backwardContrast: number): { fill: string; fillOpacity?: number } {
  if (turn < 0) return { fill: BACKWARD_BG, fillOpacity: backwardContrast / 100 }
  return { fill: FORWARD_BG }
}

/**
 * Turning diagram: shows the visible thread color per row/tablet as a
 * tilted ellipse. The tilt shows the twist - the actual result of card
 * orientation (S/Z) AND turn command combined - with S orientation, a
 * forward turn tilts right and a backward turn tilts left (reversed for Z
 * orientation). The turn command itself (forward/backward) is shown
 * separately as the background behind the ellipse. Clicking a cell
 * reverses the turn direction from that row on for the whole tablet (all
 * following rows too); a red line under the first changed cell marks the
 * direction change. Press and drag across several cells to apply that same
 * reversal to each cell the pointer passes over, one after another - only
 * once the pointer is solidly inside a cell, not just grazing its edge (see
 * DRAG_HIT_INSET). A button at the end of each row (if `onInvertRow` is
 * set) inverts every tablet's turn in just that row instead, without
 * cascading to other rows. A pattern starts at the bottom with row 1 (index 0 in
 * turningSequence) and grows upward - closer to how it works while
 * actually weaving. Columns labeled 1..n from the left. In "untwist"
 * display mode (`untwistMode`), the row order is reversed and every turn
 * is inverted (see applyUntwistOrder) - shows how to weave backward to
 * remove the twist.
 */
export function WeaveDiagram({
  pattern,
  palette,
  onCellClick,
  onInvertRow,
  displaySettings = DEFAULT_DISPLAY_SETTINGS,
  activeRow = null,
  untwistMode = false,
}: WeaveDiagramProps) {
  const { t } = useLanguage()
  const colorBySlot = new Map(palette.map((slot) => [slot.slotId, slot.hex]))
  const colorOf = (slotId: string) => colorBySlot.get(slotId) ?? FALLBACK_COLOR

  const activeRowRef = useRef<SVGRectElement>(null)
  useEffect(() => {
    if (activeRow != null) activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeRow])

  /** Tracks press-and-drag across cells: pointer down starts it, pointer up (anywhere) ends it. */
  const isDraggingRef = useRef(false)
  useEffect(() => {
    function handlePointerUp() {
      isDraggingRef.current = false
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [])

  function handleCellPointerDown(rowIndex: number, tabletIndex: number, e: ReactPointerEvent) {
    if (!onCellClick) return
    e.preventDefault()
    // Touch implicitly captures the pointer to this cell, which would suppress
    // pointerenter on cells dragged over afterward (unlike mouse) - releasing it
    // right away makes touch-dragging behave the same as a mouse drag.
    e.currentTarget.releasePointerCapture(e.pointerId)
    isDraggingRef.current = true
    onCellClick(rowIndex, tabletIndex)
  }

  function handleCellPointerEnter(rowIndex: number, tabletIndex: number) {
    if (!onCellClick || !isDraggingRef.current) return
    onCellClick(rowIndex, tabletIndex)
  }

  const weaveGrid = computeWeaveGrid(untwistMode ? applyUntwistOrder(pattern) : pattern)

  const twistByTablet = computeTwistByTablet(pattern)
  const formatTwist = (twist: number) => (twist > 0 ? `+${twist}` : `${twist}`)

  const gridWidth = pattern.numTablets * STEP
  const gridHeight = pattern.numRows * STEP
  const totalWidth = ROW_LABEL_WIDTH + gridWidth + (onInvertRow ? INVERT_ROW_WIDTH : 0)
  const totalHeight = COL_LABEL_HEIGHT + gridHeight + COL_LABEL_HEIGHT

  /** Row 0 (woven first) at the bottom, higher rows further up. */
  const rowY = (rowIndex: number) => COL_LABEL_HEIGHT + (pattern.numRows - 1 - rowIndex) * STEP

  return (
    <svg
      role="img"
      aria-label={t('weaveAriaLabel', { title: pattern.title })}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      className="text-foreground"
      style={{ maxWidth: totalWidth }}
    >
      {pattern.threading.map((_, tabletIndex) => (
        <text
          key={`col-top-${tabletIndex}`}
          x={ROW_LABEL_WIDTH + tabletIndex * STEP + CELL / 2}
          y={COL_LABEL_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {formatTwist(twistByTablet[tabletIndex])}
        </text>
      ))}

      {pattern.threading.map((_, tabletIndex) => (
        <text
          key={`col-bottom-${tabletIndex}`}
          x={ROW_LABEL_WIDTH + tabletIndex * STEP + CELL / 2}
          y={COL_LABEL_HEIGHT + gridHeight + COL_LABEL_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {tabletIndex + 1}
        </text>
      ))}

      {Array.from({ length: pattern.numRows }, (_, rowIndex) => (
        <text
          key={`row-${rowIndex}`}
          x={ROW_LABEL_WIDTH / 2}
          y={rowY(rowIndex) + CELL / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {rowIndex + 1}
        </text>
      ))}

      {onInvertRow &&
        Array.from({ length: pattern.numRows }, (_, rowIndex) => (
          <g
            key={`invert-row-${rowIndex}`}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => onInvertRow(rowIndex)}
          >
            <title>{t('weaveInvertRowLabel', { number: String(rowIndex + 1) })}</title>
            <rect x={ROW_LABEL_WIDTH + gridWidth} y={rowY(rowIndex)} width={INVERT_ROW_WIDTH} height={STEP} fill="transparent" />
            <ArrowUpDown
              x={ROW_LABEL_WIDTH + gridWidth + (INVERT_ROW_WIDTH - INVERT_ICON_SIZE) / 2}
              y={rowY(rowIndex) + (STEP - INVERT_ICON_SIZE) / 2}
              width={INVERT_ICON_SIZE}
              height={INVERT_ICON_SIZE}
              pointerEvents="none"
            />
          </g>
        ))}

      {weaveGrid.map((row) =>
        row.map((cell) => {
          const cx = ROW_LABEL_WIDTH + cell.tabletIndex * STEP + CELL / 2
          const cy = rowY(cell.rowIndex) + CELL / 2
          const angle = angleForEffectiveDirection(cell.effectiveDirection)
          const isEmpty = !colorBySlot.has(cell.colorSlotId)
          const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
          const isDirectionChange = previousTurn !== undefined && Math.sign(previousTurn) !== Math.sign(cell.turn)
          return (
            <g key={`${cell.rowIndex}-${cell.tabletIndex}`}>
              <rect
                x={cx - CELL / 2}
                y={cy - CELL / 2}
                width={CELL}
                height={CELL}
                rx={2}
                {...backgroundForTurn(cell.turn, displaySettings.backwardContrast)}
                onPointerDown={
                  onCellClick ? (e) => handleCellPointerDown(cell.rowIndex, cell.tabletIndex, e) : undefined
                }
                className={onCellClick ? 'cursor-pointer hover:opacity-70' : undefined}
              />
              {onCellClick && (
                <rect
                  x={cx - CELL / 2 + DRAG_HIT_INSET}
                  y={cy - CELL / 2 + DRAG_HIT_INSET}
                  width={CELL - DRAG_HIT_INSET * 2}
                  height={CELL - DRAG_HIT_INSET * 2}
                  fill="transparent"
                  onPointerEnter={() => handleCellPointerEnter(cell.rowIndex, cell.tabletIndex)}
                />
              )}
              {displaySettings.weaveCellShape === 'square' ? (
                <rect
                  x={cx - SQUARE_SIZE / 2}
                  y={cy - SQUARE_SIZE / 2}
                  width={SQUARE_SIZE}
                  height={SQUARE_SIZE}
                  rx={4}
                  fill={isEmpty ? FALLBACK_COLOR : colorOf(cell.colorSlotId)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  pointerEvents="none"
                />
              ) : (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={ELLIPSE_RX}
                  ry={ELLIPSE_RY}
                  fill={isEmpty ? FALLBACK_COLOR : colorOf(cell.colorSlotId)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  transform={`rotate(${angle} ${cx} ${cy})`}
                  pointerEvents="none"
                />
              )}
              {displaySettings.weaveCellShape === 'square' && !isEmpty && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_FONT_SIZE}
                  fontWeight="bold"
                  fill="black"
                  stroke="white"
                  strokeWidth={2}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {cell.turn < 0 ? 'B' : 'F'}
                </text>
              )}
              {isEmpty && (
                <g pointerEvents="none">
                  <line
                    x1={cx - CELL / 2}
                    y1={cy - CELL / 2}
                    x2={cx + CELL / 2}
                    y2={cy + CELL / 2}
                    stroke="var(--background)"
                    strokeWidth={1}
                  />
                  <line
                    x1={cx + CELL / 2}
                    y1={cy - CELL / 2}
                    x2={cx - CELL / 2}
                    y2={cy + CELL / 2}
                    stroke="var(--background)"
                    strokeWidth={1}
                  />
                </g>
              )}
              {isDirectionChange && (
                <line
                  x1={cx - CELL / 2}
                  y1={cy + CELL / 2}
                  x2={cx + CELL / 2}
                  y2={cy + CELL / 2}
                  stroke="#23C2F1"
                  strokeWidth={3}
                  pointerEvents="none"
                />
              )}
            </g>
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

      {displaySettings.showCenterLine && (
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
