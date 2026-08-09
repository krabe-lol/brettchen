import { useEffect, useRef } from 'react'
import { applyUntwistOrder, computeDisplayWeaveGrid } from './render/weaveGrid'
import { CELL, COL_LABEL_HEIGHT, FALLBACK_COLOR, LABEL_FONT_SIZE, ROW_LABEL_WIDTH, STEP } from './render/gridLayout'
import { useLanguage } from '@/features/i18n/LanguageContext'
import type { Pattern, PaletteSlot } from './types'

interface WovenBandDiagramProps {
  pattern: Pattern
  palette: PaletteSlot[]
  /** Wenn gesetzt (0-basiert), wird diese Reihe hervorgehoben und bei Änderung in den Viewport gescrollt – siehe PatternDiagrams-Navigation. */
  activeRow?: number | null
  /** Zeigt das Band rückwärts (siehe applyUntwistOrder) – pro Muster/Nutzer:in gespeichert, siehe usePatternHighlightSettings. */
  untwistMode?: boolean
  /** Blendet eine senkrechte Hilfslinie in der Brettchen-Mitte ein. Siehe DisplaySettings.showCenterLine. */
  showCenterLine?: boolean
}

/** Mindestanzahl Reihen in der Bandvorschau – kürzere Drehmuster werden dafür wiederholt. */
const MIN_DISPLAY_ROWS = 40

/**
 * Realistische Bandvorschau, in derselben Ausrichtung wie das Drehmuster
 * (Brettchen als Spalten von links, Reihe 1 unten, wächst nach oben). Statt
 * Ellipsen zeigt jede Zelle ein Parallelogramm mit geraden, senkrechten
 * Seiten und schrägen (45°/135°) Ober-/Unterkanten – die höhere Spitze
 * liegt auf der Seite, in die die Ellipse im Drehmuster kippen würde
 * (`effectiveDirection`). Nur die Reihe eines Richtungswechsels (derselbe
 * Umkehrpunkt, den das Drehmuster mit der cyanen Linie markiert) wird zum
 * Dreieck: die stumpfe obere Ecke fällt weg, die Reihe davor und die direkt
 * danach bleiben normale Parallelogramme. Rein lesend, nicht klickbar.
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

  const activeRowRef = useRef<SVGRectElement>(null)
  useEffect(() => {
    if (activeRow != null) activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeRow])

  const weaveGrid = computeDisplayWeaveGrid(untwistMode ? applyUntwistOrder(pattern) : pattern, MIN_DISPLAY_ROWS)
  const displayNumRows = weaveGrid.length

  const gridWidth = pattern.numTablets * STEP
  const gridHeight = displayNumRows * STEP
  const totalWidth = ROW_LABEL_WIDTH + gridWidth
  const totalHeight = COL_LABEL_HEIGHT + gridHeight

  /** Reihe 0 (zuerst gewebt) unten, höhere Reihen weiter oben – wie im Drehmuster. */
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
          x={ROW_LABEL_WIDTH + tabletIndex * STEP + CELL / 2}
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
          y={rowY(rowIndex) + CELL / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          fill="currentColor"
        >
          {rowIndex + 1}
        </text>
      ))}

      {weaveGrid.map((row) =>
        row.map((cell) => {
          const cx = ROW_LABEL_WIDTH + cell.tabletIndex * STEP + CELL / 2
          const cy = rowY(cell.rowIndex) + CELL / 2
          const xLeft = cx - CELL / 2
          const xRight = cx + CELL / 2
          const fill = colorOf(cell.colorSlotId)

          const previousTurn = weaveGrid[cell.rowIndex - 1]?.[cell.tabletIndex]?.turn
          const isDirectionChange = previousTurn !== undefined && Math.sign(previousTurn) !== Math.sign(cell.turn)

          let points: string
          if (cell.effectiveDirection === 0) {
            // Kein Kipp-Ausschlag: einfaches, ungeneigtes Rechteck über eine Reihe.
            const yTop = cy - STEP / 2
            const yBottom = cy + STEP / 2
            points = `${xLeft},${yTop} ${xRight},${yTop} ${xRight},${yBottom} ${xLeft},${yBottom}`
          } else {
            const leaningLeft = cell.effectiveDirection > 0
            const yTopExtreme = cy - STEP
            const yBottomExtreme = cy + STEP
            const yTopShoulder = yTopExtreme + CELL
            const yBottomShoulder = yBottomExtreme - CELL

            const topLeft = leaningLeft ? yTopShoulder : yTopExtreme
            const topRight = leaningLeft ? yTopExtreme : yTopShoulder
            const bottomLeft = leaningLeft ? yBottomExtreme : yBottomShoulder
            const bottomRight = leaningLeft ? yBottomShoulder : yBottomExtreme

            if (isDirectionChange) {
              // während Richtungswechsel
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
              stroke="black"
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
