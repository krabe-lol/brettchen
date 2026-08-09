import { computeDisplayWeaveGrid, type WeaveCell } from './render/weaveGrid'
import { CELL, FALLBACK_COLOR, STEP } from './render/gridLayout'
import type { Pattern, PaletteSlot } from './types'

interface PatternThumbnailProps {
  pattern: Pick<Pattern, 'title' | 'threading' | 'turningSequence' | 'numTablets' | 'numRows' | 'repeatFromRow'>
  palette: PaletteSlot[]
  className?: string
}

/**
 * Eckpunkte einer Zelle als Parallelogramm (gerade, senkrechte Seiten,
 * schräge 45°/135° Ober-/Unterkanten, zwei Reihen hoch) bzw. an einem
 * Richtungswechsel als Dreieck (stumpfe obere Ecke fällt weg) – dieselbe
 * Geometrie wie im WovenBandDiagram, siehe dort für die Herleitung.
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

/** Ziel-Seitenverhältnis der Vorschau (Breite:Höhe der Card) – bestimmt, wie viele Reihen mindestens nötig sind, damit "slice" nie leeren Rand zeigt. */
const TARGET_ASPECT = 3

/**
 * Kompaktes Vorschaubild des Webmusters (nicht der Schärpatrone) – exakt
 * dasselbe berechnete Band wie im WovenBandDiagram (inklusive Wiederholung
 * ab `repeatFromRow`, siehe computeDisplayWeaveGrid), nur ohne
 * Beschriftungen/Hintergrundflächen/Klickbarkeit. Um -90° gedreht (Muster
 * sind meist schmal/lang – wenige Brettchen, viele Reihen –, gedreht füllen
 * sie die breite Card besser). Die Breite des Musters (Brettchenzahl, in
 * Originalausrichtung) füllt dabei immer exakt die volle Höhe der Vorschau
 * – nie beschnitten; ist das Muster (in Reihen) zu kurz, um die Vorschau
 * horizontal zu füllen, wiederholt es sich wie im WovenBandDiagram.
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
