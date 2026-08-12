import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUpDown, GripVertical } from 'lucide-react'
import { applyUntwistOrder, computeWeaveGrid } from './render/weaveGrid'
import { computeTwistByTablet, hasDirectionChange } from './render/twist'
import { CELL, COL_LABEL_HEIGHT, FALLBACK_COLOR, LABEL_FONT_SIZE, ROW_LABEL_WIDTH, STEP } from './render/gridLayout'
import { DEFAULT_DISPLAY_SETTINGS } from './render/orientationDisplay'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import type { DisplaySettings } from './render/orientationDisplay'
import type { Pattern, PaletteSlot, TurnValue } from './types'

interface WeaveDiagramProps {
  pattern: Pattern
  palette: PaletteSlot[]
  /** If set, cells become clickable (reverses turn direction from here on). */
  onCellClick?: (rowIndex: number, tabletIndex: number) => void
  /** If set, a button at the end of each row inverts every tablet's turn from that row up. */
  onInvertRow?: (rowIndex: number) => void
  /** If set, a row can be dragged to another position via its row-label header, like tablets in the threading chart. */
  onMoveRow?: (fromIndex: number, toIndex: number) => void
  /** If set, clicking a tablet's twist counter excludes/re-includes it from the twist-neutrality check - only possible for a tablet that never turns. */
  onToggleTwistExempt?: (tabletIndex: number) => void
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

const GRIP_SIZE = 12

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
 * set) does the same reversal for every tablet in that row at once, same
 * cascade to the rows above. A pattern starts at the bottom with row 1 (index 0 in
 * turningSequence) and grows upward - closer to how it works while
 * actually weaving. Columns labeled 1..n from the left. If `onMoveRow` is
 * set, a row can be dragged to another position via its row-label header
 * (grip icon on hover, same as tablets in the threading chart). The twist
 * counter above a tablet that hasn't changed direction yet (see
 * hasDirectionChange in render/twist.ts - typically a border tablet meant
 * to just keep turning the same way) is clickable if `onToggleTwistExempt`
 * is set: excludes it from the twist-neutrality check, greys out its
 * counter, and freezes its cells against clicks/drag/row-invert so it
 * can't accidentally change direction afterward. Click again to
 * re-include it. In "untwist" display mode (`untwistMode`), the row order is reversed and
 * every turn is inverted (see applyUntwistOrder) - shows how to weave
 * backward to remove the twist.
 */
export function WeaveDiagram({
  pattern,
  palette,
  onCellClick,
  onInvertRow,
  onMoveRow,
  onToggleTwistExempt,
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

  /**
   * Tracks press-and-drag across cells: pointer down starts it, pointer up
   * (anywhere) ends it. `toggledCellsRef` remembers which cells already
   * flipped during the current drag, so re-entering one (e.g. wiggling
   * back and forth) doesn't flip it again - only a fresh press starts a new drag.
   */
  const isDraggingRef = useRef(false)
  const toggledCellsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    function handlePointerUp() {
      isDraggingRef.current = false
      toggledCellsRef.current.clear()
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
    toggledCellsRef.current = new Set([`${rowIndex}-${tabletIndex}`])
    onCellClick(rowIndex, tabletIndex)
  }

  function handleCellPointerEnter(rowIndex: number, tabletIndex: number) {
    if (!onCellClick || !isDraggingRef.current) return
    const key = `${rowIndex}-${tabletIndex}`
    if (toggledCellsRef.current.has(key)) return
    toggledCellsRef.current.add(key)
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

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null)
  const [dropRowIndex, setDropRowIndex] = useState<number | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)

  /** Screen Y coordinate converted to SVG user units. */
  function svgYAtClientY(clientY: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    return ((clientY - rect.top) / rect.height) * totalHeight
  }

  /** Converts a screen Y coordinate to the row index under the pointer. */
  function rowIndexAtClientY(clientY: number): number {
    const index = pattern.numRows - 1 - Math.floor((svgYAtClientY(clientY) - COL_LABEL_HEIGHT) / STEP)
    return Math.max(0, Math.min(pattern.numRows - 1, index))
  }

  function handleRowPointerDown(rowIndex: number, e: ReactPointerEvent) {
    if (!onMoveRow) return
    const moveRow = onMoveRow
    e.preventDefault()
    const startSvgY = svgYAtClientY(e.clientY)
    setDraggedRowIndex(rowIndex)
    setDropRowIndex(rowIndex)
    setDragOffsetY(0)

    function handlePointerMove(moveEvent: PointerEvent) {
      setDragOffsetY(svgYAtClientY(moveEvent.clientY) - startSvgY)
      setDropRowIndex(rowIndexAtClientY(moveEvent.clientY))
    }

    function handlePointerUp(upEvent: PointerEvent) {
      const target = rowIndexAtClientY(upEvent.clientY)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setDraggedRowIndex(null)
      setDropRowIndex(null)
      setDragOffsetY(0)
      if (target !== rowIndex) moveRow(rowIndex, target)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // Render the dragged row last so it stays above neighboring rows while moving.
  const rowOrder = Array.from({ length: pattern.numRows }, (_, index) => index)
  if (draggedRowIndex !== null) {
    rowOrder.splice(rowOrder.indexOf(draggedRowIndex), 1)
    rowOrder.push(draggedRowIndex)
  }

  /**
   * Shifts neighboring rows by however much the actual `moveRow(from, to)`
   * result would - opens a gap exactly where the pointer is dragging over.
   * Row index and screen Y run in opposite directions (see rowY), so this
   * is column shift in ThreadingDiagram with the sign flipped.
   */
  function rowShift(rowIndex: number): number {
    if (draggedRowIndex === null || dropRowIndex === null || rowIndex === draggedRowIndex) return 0
    if (dropRowIndex > draggedRowIndex) {
      return rowIndex > draggedRowIndex && rowIndex <= dropRowIndex ? STEP : 0
    }
    return rowIndex >= dropRowIndex && rowIndex < draggedRowIndex ? -STEP : 0
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={t('weaveAriaLabel', { title: pattern.title })}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      className="text-foreground"
      style={{ maxWidth: totalWidth }}
    >
      {pattern.threading.map((_, tabletIndex) => {
        const isExempt = pattern.twistExemptTablets.includes(tabletIndex)
        const eligible = !hasDirectionChange(pattern.turningSequence, tabletIndex)
        const canToggle = Boolean(onToggleTwistExempt) && (eligible || isExempt)
        return (
          <g key={`col-top-${tabletIndex}`}>
            {isExempt && (
              <rect
                x={ROW_LABEL_WIDTH + tabletIndex * STEP}
                y={0}
                width={CELL}
                height={COL_LABEL_HEIGHT}
                rx={2}
                fill="var(--ring)"
                pointerEvents="none"
              />
            )}
            {canToggle && (
              <>
                <title>{t('weaveToggleTwistExemptLabel', { number: String(tabletIndex + 1) })}</title>
                <rect
                  x={ROW_LABEL_WIDTH + tabletIndex * STEP}
                  y={0}
                  width={CELL}
                  height={COL_LABEL_HEIGHT}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onToggleTwistExempt!(tabletIndex)}
                />
              </>
            )}
            <text
              x={ROW_LABEL_WIDTH + tabletIndex * STEP + CELL / 2}
              y={COL_LABEL_HEIGHT / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={LABEL_FONT_SIZE}
              fill={isExempt ? "var(--theme)" : "var(--foreground)"}
              pointerEvents="none"
            >
              {formatTwist(twistByTablet[tabletIndex])}
            </text>
          </g>
        )
      })}

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

      {rowOrder.map((rowIndex) => {
        const row = weaveGrid[rowIndex] ?? []
        const isRowDragged = draggedRowIndex === rowIndex
        const rowShiftAmount = isRowDragged ? dragOffsetY : rowShift(rowIndex)

        return (
          <g
            key={`row-group-${rowIndex}`}
            style={rowShiftAmount ? { transform: `translateY(${rowShiftAmount}px)` } : undefined}
            className={cn(!isRowDragged && 'transition-transform duration-150', isRowDragged && 'drop-shadow-lg')}
          >
            <g className={onMoveRow ? 'group' : undefined}>
              <rect
                x={0}
                y={rowY(rowIndex)}
                width={ROW_LABEL_WIDTH}
                height={STEP}
                rx={2}
                fill="var(--background)"
                className={cn(onMoveRow && 'cursor-grab group-hover:fill-accent', isRowDragged && 'cursor-grabbing fill-accent')}
                onPointerDown={onMoveRow ? (e) => handleRowPointerDown(rowIndex, e) : undefined}
              />
              {onMoveRow && (
                <g
                  transform={`translate(${ROW_LABEL_WIDTH / 2 - GRIP_SIZE / 2}, ${rowY(rowIndex) + CELL / 2 - GRIP_SIZE / 2})`}
                  pointerEvents="none"
                  className={cn('opacity-0 group-hover:opacity-80', isRowDragged && 'opacity-80')}
                >
                  <GripVertical width={GRIP_SIZE} height={GRIP_SIZE} />
                </g>
              )}
              <text
                x={ROW_LABEL_WIDTH / 2}
                y={rowY(rowIndex) + CELL / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT_SIZE}
                fill="currentColor"
                pointerEvents="none"
                className={onMoveRow ? 'group-hover:opacity-0' : undefined}
              >
                {rowIndex + 1}
              </text>
            </g>

            {onInvertRow && (
              <g
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => onInvertRow(rowIndex)}
              >
                <title>{t('weaveInvertRowLabel', { number: String(rowIndex + 1) })}</title>
                <rect
                  x={ROW_LABEL_WIDTH + gridWidth}
                  y={rowY(rowIndex)}
                  width={INVERT_ROW_WIDTH}
                  height={STEP}
                  fill="transparent"
                />
                <ArrowUpDown
                  x={ROW_LABEL_WIDTH + gridWidth + (INVERT_ROW_WIDTH - INVERT_ICON_SIZE) / 2}
                  y={rowY(rowIndex) + (STEP - INVERT_ICON_SIZE) / 2}
                  width={INVERT_ICON_SIZE}
                  height={INVERT_ICON_SIZE}
                  pointerEvents="none"
                />
              </g>
            )}

            {row.map((cell) => {
              const cx = ROW_LABEL_WIDTH + cell.tabletIndex * STEP + CELL / 2
              const cy = rowY(cell.rowIndex) + CELL / 2
              const angle = angleForEffectiveDirection(cell.effectiveDirection)
              const isEmpty = !colorBySlot.has(cell.colorSlotId)
              const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
              const isDirectionChange = previousTurn !== undefined && Math.sign(previousTurn) !== Math.sign(cell.turn)
              // A twist-exempt tablet's whole point is to keep turning the same way undisturbed
              // (see toggleTwistExempt in usePatternEditor.ts), so its cells don't react at all.
              const isClickable = Boolean(onCellClick) && !pattern.twistExemptTablets.includes(cell.tabletIndex)
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
                      isClickable ? (e) => handleCellPointerDown(cell.rowIndex, cell.tabletIndex, e) : undefined
                    }
                    className={isClickable ? 'cursor-pointer hover:opacity-70' : undefined}
                  />
                  {isClickable && (
                    <rect
                      x={cx - CELL / 2 + DRAG_HIT_INSET}
                      y={cy - CELL / 2 + DRAG_HIT_INSET}
                      width={CELL - DRAG_HIT_INSET * 2}
                      height={CELL - DRAG_HIT_INSET * 2}
                      fill="transparent"
                      className="cursor-pointer"
                      // Sits on top of the full cell rect above, so it also needs its own
                      // pointerdown - otherwise it would swallow clicks in the cell's center
                      // without acting on them, leaving only the outer margin clickable.
                      onPointerDown={(e) => handleCellPointerDown(cell.rowIndex, cell.tabletIndex, e)}
                      onPointerEnter={() => handleCellPointerEnter(cell.rowIndex, cell.tabletIndex)}
                    />
                  )}
                  {isEmpty ? (
                    // No thread here - a corner-to-corner diagonal instead of a shape, leaning the
                    // same way the ellipse/square would have tilted (see angleForEffectiveDirection).
                    <line
                      x1={cx - CELL / 2}
                      y1={cell.effectiveDirection < 0 ? cy - CELL / 2 : cy + CELL / 2}
                      x2={cx + CELL / 2}
                      y2={cell.effectiveDirection < 0 ? cy + CELL / 2 : cy - CELL / 2}
                      stroke="var(--foreground)"
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  ) : displaySettings.weaveCellShape === 'square' ? (
                    <rect
                      x={cx - SQUARE_SIZE / 2}
                      y={cy - SQUARE_SIZE / 2}
                      width={SQUARE_SIZE}
                      height={SQUARE_SIZE}
                      rx={4}
                      fill={colorOf(cell.colorSlotId)}
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
                      fill={colorOf(cell.colorSlotId)}
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
            })}
          </g>
        )
      })}

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
