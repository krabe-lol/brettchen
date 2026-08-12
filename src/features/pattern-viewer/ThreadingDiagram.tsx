import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripHorizontal } from 'lucide-react'
import {
  CELL,
  COL_LABEL_HEIGHT,
  DELETE_ROW_HEIGHT,
  FALLBACK_COLOR,
  LABEL_FONT_SIZE,
  SPACE_DELETE,
  ORIENTATION_ROW_HEIGHT,
  ROW_LABEL_WIDTH,
  STEP,
} from './render/gridLayout'
import { DEFAULT_DISPLAY_SETTINGS, displayHoleLetter, displayOrientation } from './render/orientationDisplay'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import type { DisplaySettings } from './render/orientationDisplay'
import type { Pattern, PaletteSlot } from './types'

interface ThreadingDiagramProps {
  pattern: Pick<Pattern, 'title' | 'threading' | 'holesPerTablet' | 'numTablets'>
  palette: PaletteSlot[]
  /** If set, cells become clickable (apply color). */
  onCellClick?: (tabletIndex: number, holeIndex: number) => void
  /** If set, the S/Z card orientation below each tablet becomes clickable. */
  onOrientationClick?: (tabletIndex: number) => void
  /** If set, a tablet can be dragged to another position via its column header. */
  onMoveTablet?: (fromIndex: number, toIndex: number) => void
  /** If set, a small "x" appears below each column to delete that tablet. */
  onRemoveTablet?: (tabletIndex: number) => void
  /** Display-only, never changes the saved value. See render/orientationDisplay.ts. */
  displaySettings?: DisplaySettings
  /** If set (0-based), this tablet's column is highlighted and scrolled into view on change - see PatternDiagrams navigation. */
  activeTablet?: number | null
}

const GRIP_SIZE = 12

/**
 * Threading chart: shows how the tablets are threaded. Rows labeled
 * D,C,B,A from top to bottom, columns labeled 1..n from the left. If
 * `onMoveTablet` is set, a grip icon in the column header signals it's
 * draggable; while dragging, the whole column (cells + card orientation)
 * visibly follows the pointer and is drawn above neighboring columns, with
 * the drop target highlighted.
 */
export function ThreadingDiagram({
  pattern,
  palette,
  onCellClick,
  onOrientationClick,
  onMoveTablet,
  onRemoveTablet,
  displaySettings = DEFAULT_DISPLAY_SETTINGS,
  activeTablet = null,
}: ThreadingDiagramProps) {
  const { t } = useLanguage()
  const colorBySlot = new Map(palette.map((slot) => [slot.slotId, slot.hex]))
  const colorOf = (slotId: string) => colorBySlot.get(slotId) ?? FALLBACK_COLOR

  const activeTabletRef = useRef<SVGRectElement>(null)
  useEffect(() => {
    if (activeTablet != null) {
      activeTabletRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTablet])

  const gridWidth = pattern.numTablets * STEP
  const gridHeight = pattern.holesPerTablet * STEP
  const totalWidth = ROW_LABEL_WIDTH + gridWidth
  const totalHeight = COL_LABEL_HEIGHT + gridHeight + ORIENTATION_ROW_HEIGHT + (onRemoveTablet ? SPACE_DELETE + DELETE_ROW_HEIGHT : 0)

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragOffsetX, setDragOffsetX] = useState(0)

  /** Screen X coordinate converted to SVG user units. */
  function svgXAtClientX(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    return ((clientX - rect.left) / rect.width) * totalWidth
  }

  /** Converts a screen X coordinate to the tablet index under the pointer. */
  function tabletIndexAtClientX(clientX: number): number {
    const index = Math.floor((svgXAtClientX(clientX) - ROW_LABEL_WIDTH) / STEP)
    return Math.max(0, Math.min(pattern.numTablets - 1, index))
  }

  function handlePointerDown(tabletIndex: number, e: ReactPointerEvent) {
    if (!onMoveTablet) return
    const moveTablet = onMoveTablet
    e.preventDefault()
    const startSvgX = svgXAtClientX(e.clientX)
    setDraggedIndex(tabletIndex)
    setDropIndex(tabletIndex)
    setDragOffsetX(0)

    function handlePointerMove(moveEvent: PointerEvent) {
      setDragOffsetX(svgXAtClientX(moveEvent.clientX) - startSvgX)
      setDropIndex(tabletIndexAtClientX(moveEvent.clientX))
    }

    function handlePointerUp(upEvent: PointerEvent) {
      const target = tabletIndexAtClientX(upEvent.clientX)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setDraggedIndex(null)
      setDropIndex(null)
      setDragOffsetX(0)
      if (target !== tabletIndex) moveTablet(tabletIndex, target)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // Render the dragged column last so it stays above neighboring columns while moving.
  const tabletOrder = pattern.threading.map((_, index) => index)
  if (draggedIndex !== null) {
    tabletOrder.splice(tabletOrder.indexOf(draggedIndex), 1)
    tabletOrder.push(draggedIndex)
  }

  /**
   * Shifts neighboring columns by however much the actual
   * `moveTablet(from, to)` result would - this opens a gap exactly where
   * the pointer is currently dragging over.
   */
  function columnShift(tabletIndex: number): number {
    if (draggedIndex === null || dropIndex === null || tabletIndex === draggedIndex) return 0
    if (dropIndex > draggedIndex) {
      return tabletIndex > draggedIndex && tabletIndex <= dropIndex ? -STEP : 0
    }
    return tabletIndex >= dropIndex && tabletIndex < draggedIndex ? STEP : 0
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={t('threadingAriaLabel', { title: pattern.title })}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      className="text-foreground"
      style={{ maxWidth: totalWidth }}
    >
      {Array.from({ length: pattern.holesPerTablet }, (_, holeIndex) => (
        <text
          key={`row-${holeIndex}`}
          x={ROW_LABEL_WIDTH / 2}
          y={COL_LABEL_HEIGHT + (pattern.holesPerTablet - 1 - holeIndex) * STEP + CELL / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {displayHoleLetter(holeIndex, displaySettings)}
        </text>
      ))}

      {tabletOrder.map((tabletIndex) => {
        const tablet = pattern.threading[tabletIndex]
        const isDragged = draggedIndex === tabletIndex
        const colX = ROW_LABEL_WIDTH + tabletIndex * STEP
        const orientationY = COL_LABEL_HEIGHT + gridHeight
        const shift = isDragged ? dragOffsetX : columnShift(tabletIndex)

        return (
          <g
            key={`col-${tabletIndex}`}
            style={shift ? { transform: `translateX(${shift}px)` } : undefined}
            className={cn(!isDragged && 'transition-transform duration-150', isDragged && 'drop-shadow-lg')}
          >
            <g className={onMoveTablet ? 'group' : undefined}>
              <rect
                x={colX}
                y={0}
                width={CELL}
                height={COL_LABEL_HEIGHT}
                rx={2}
                fill="var(--background)"
                className={cn(onMoveTablet && 'cursor-grab group-hover:fill-accent', isDragged && 'cursor-grabbing fill-accent')}
                onPointerDown={(e) => handlePointerDown(tabletIndex, e)}
              />
              {onMoveTablet && (
                <g
                  transform={`translate(${colX + CELL / 2 - GRIP_SIZE / 2}, ${COL_LABEL_HEIGHT / 2 - GRIP_SIZE / 2})`}
                  pointerEvents="none"
                  className={cn('opacity-0 group-hover:opacity-80', isDragged && 'opacity-80')}
                >
                  <GripHorizontal width={GRIP_SIZE} height={GRIP_SIZE} />
                </g>
              )}
              <text
                x={colX + CELL / 2}
                y={COL_LABEL_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT_SIZE}
                fill="currentColor"
                pointerEvents="none"
                className={onMoveTablet ? 'group-hover:opacity-0' : undefined}
              >
                {tabletIndex + 1}
              </text>
            </g>

            {tablet.holes.map((hole, holeIndex) => {
              const isEmpty = !colorBySlot.has(hole.colorSlotId)
              const y = COL_LABEL_HEIGHT + (pattern.holesPerTablet - 1 - holeIndex) * STEP
              return (
                <g key={holeIndex}>
                  <rect
                    x={colX}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={1}
                    fill={isEmpty ? FALLBACK_COLOR : colorOf(hole.colorSlotId)}
                    fillOpacity={isEmpty ? 0.3 : undefined}
                    onClick={onCellClick ? () => onCellClick(tabletIndex, holeIndex) : undefined}
                    className={onCellClick ? 'cursor-pointer hover:opacity-70' : undefined}
                  />
                  {isEmpty && (
                    <g pointerEvents="none">
                      <line x1={colX} y1={y} x2={colX + CELL} y2={y + CELL} stroke="var(--background)" strokeWidth={1} />
                      <line x1={colX + CELL} y1={y} x2={colX} y2={y + CELL} stroke="var(--background)" strokeWidth={1} />
                    </g>
                  )}
                </g>
              )
            })}

            <g>
              <rect
                x={colX}
                y={orientationY}
                width={CELL}
                height={ORIENTATION_ROW_HEIGHT}
                rx={2}
                className={cn('fill-muted', onOrientationClick && 'cursor-pointer hover:fill-accent')}
                onClick={onOrientationClick ? () => onOrientationClick(tabletIndex) : undefined}
              />
              <text
                x={colX + CELL / 2}
                y={orientationY + ORIENTATION_ROW_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT_SIZE}
                fill="currentColor"
                pointerEvents="none"
              >
                {displayOrientation(tablet.orientation, displaySettings)}
              </text>
            </g>

            {onRemoveTablet && (
              <g className="group/remove cursor-pointer" onClick={() => onRemoveTablet(tabletIndex)}>
                <title>{t('threadingRemoveTabletLabel', { number: String(tabletIndex + 1) })}</title>
                <rect
                  x={colX}
                  y={orientationY + ORIENTATION_ROW_HEIGHT + SPACE_DELETE}
                  width={CELL}
                  height={DELETE_ROW_HEIGHT}
                  fill="transparent"
                />
                <text
                  x={colX + CELL / 2}
                  y={orientationY + ORIENTATION_ROW_HEIGHT + SPACE_DELETE + DELETE_ROW_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_FONT_SIZE}
                  className="fill-muted-foreground group-hover/remove:fill-destructive"
                  pointerEvents="none"
                >
                  ×
                </text>
              </g>
            )}
          </g>
        )
      })}

      {activeTablet != null && (
        <rect
          ref={activeTabletRef}
          x={ROW_LABEL_WIDTH + activeTablet * STEP}
          y={0}
          width={STEP}
          height={totalHeight}
          rx={2}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          style={{ scrollMarginInline: '96px' }}
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
