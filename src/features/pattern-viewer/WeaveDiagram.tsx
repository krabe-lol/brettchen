import { useEffect, useRef } from 'react'
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
  /** Wenn gesetzt, werden die Zellen klickbar (Drehrichtung ab hier umkehren). */
  onCellClick?: (rowIndex: number, tabletIndex: number) => void
  /** Rein anzeigeseitig, ändert nie den gespeicherten Wert. Siehe render/orientationDisplay.ts. */
  displaySettings?: DisplaySettings
  /** Wenn gesetzt (0-basiert), wird diese Reihe hervorgehoben und bei Änderung in den Viewport gescrollt – siehe PatternDiagrams-Navigation. */
  activeRow?: number | null
  /** Zeigt das Drehmuster rückwärts (siehe applyUntwistOrder) – pro Muster/Nutzer:in gespeichert, siehe usePatternHighlightSettings. */
  untwistMode?: boolean
}

const ELLIPSE_RX = 8
const ELLIPSE_RY = 13
const RIGHT_ANGLE = -40
const LEFT_ANGLE = 40

const SQUARE_SIZE = CELL

const FORWARD_BG = 'var(--background)'
const BACKWARD_BG = 'var(--foreground)'

/** Der Ellipsenwinkel zeigt die Verdrillung: das Ergebnis aus Schären × Drehung (nicht die Drehung allein). */
function angleForEffectiveDirection(effectiveDirection: -1 | 0 | 1): number {
  if (effectiveDirection < 0) return RIGHT_ANGLE
  if (effectiveDirection > 0) return LEFT_ANGLE
  return 0
}

/**
 * Hintergrund zeigt die Drehrichtung: Seitenhintergrund = vorwärts,
 * Vordergrundfarbe = rückwärts – deren Deckkraft ist über
 * `displaySettings.backwardContrast` einstellbar, damit sich der Kontrast
 * an die eigenen Bedürfnisse anpassen lässt.
 */
function backgroundForTurn(turn: TurnValue, backwardContrast: number): { fill: string; fillOpacity?: number } {
  if (turn < 0) return { fill: BACKWARD_BG, fillOpacity: backwardContrast / 100 }
  return { fill: FORWARD_BG }
}

/**
 * Drehmuster (Wendeplan): zeigt pro Reihe/Brettchen die sichtbare Fadenfarbe
 * als geneigte Ellipse. Die Neigung zeigt die Verdrillung – das tatsächliche Ergebnis aus
 * Kartenstellung (S/Z) UND Drehbefehl zusammen – bei S-Ausrichtung neigt
 * eine Vorwärtsdrehung nach rechts, eine Rückwärtsdrehung nach links (bei
 * Z-Ausrichtung ist es umgekehrt). Der Drehbefehl selbst (vorwärts/rückwärts)
 * wird separat als Hintergrundfläche hinter der Ellipse gezeigt. Ein Klick
 * auf eine Zelle kehrt die Drehrichtung ab dieser Reihe für das gesamte
 * Brettchen um (alle folgenden Reihen mit); eine rote Linie unter der
 * ersten geänderten Zelle markiert den Richtungswechsel. Ein Muster beginnt
 * unten bei Reihe 1 (Index 0 in turningSequence) und wächst nach oben –
 * näher an der Realität beim Weben. Spalten von links mit 1..n. Im
 * "Untwist"-Anzeigemodus (`untwistMode`) läuft die Reihenfolge umgekehrt und
 * jede Drehung ist invertiert (siehe applyUntwistOrder) – zeigt, wie
 * rückwärts gewebt werden muss, um das Muster zu entdrillen.
 */
export function WeaveDiagram({
  pattern,
  palette,
  onCellClick,
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

  const weaveGrid = computeWeaveGrid(untwistMode ? applyUntwistOrder(pattern) : pattern)

  const twistByTablet = computeTwistByTablet(pattern)
  const formatTwist = (twist: number) => (twist > 0 ? `+${twist}` : `${twist}`)

  const gridWidth = pattern.numTablets * STEP
  const gridHeight = pattern.numRows * STEP
  const totalWidth = ROW_LABEL_WIDTH + gridWidth
  const totalHeight = COL_LABEL_HEIGHT + gridHeight + COL_LABEL_HEIGHT

  /** Reihe 0 (zuerst gewebt) unten, höhere Reihen weiter oben. */
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
                onClick={onCellClick ? () => onCellClick(cell.rowIndex, cell.tabletIndex) : undefined}
                className={onCellClick ? 'cursor-pointer hover:opacity-70' : undefined}
              />
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
