import { useState } from 'react'
import { generateColorName, isSimilarColor } from './render/colorNames'
import { useLanguage } from '@/features/i18n/LanguageContext'
import type { PaletteSlot, Pattern, TabletThreading } from './types'

const MIN_TABLETS = 1
const MAX_TABLETS = 200
const MIN_ROWS = 1
const MAX_ROWS = 2000

const SLOT_ID_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function nextSlotId(existing: PaletteSlot[]): string {
  for (const letter of SLOT_ID_LETTERS) {
    if (!existing.some((slot) => slot.slotId === letter)) return letter
  }
  return `slot-${existing.length + 1}`
}

/** Standard-Drehrichtung für neu angefügte Reihen/Brettchen: vorwärts. */
const DEFAULT_TURN = 1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Hält Schären, Wendefolge und Palette eines Musters als editierbaren
 * lokalen State. Brettchen/Reihen/Farben werden ausschließlich am Ende
 * angefügt oder entfernt bzw. gezielt an einer Zelle geändert – nichts wird
 * dabei neu erzeugt oder überschrieben, damit ein bereits eingestelltes
 * Muster nie verloren geht.
 */
export function usePatternEditor(initialPattern: Pattern) {
  const { language } = useLanguage()
  const [threading, setThreading] = useState<TabletThreading[]>(initialPattern.threading)
  const [turningSequence, setTurningSequence] = useState<number[][]>(initialPattern.turningSequence)
  const [palette, setPalette] = useState<PaletteSlot[]>(initialPattern.defaultPalette)
  const [title, setTitle] = useState(initialPattern.title)
  const [style, setStyle] = useState<string[]>(initialPattern.style)
  const [notes, setNotes] = useState(initialPattern.notes)
  const [sourceUrl, setSourceUrl] = useState(initialPattern.sourceUrl)
  const [repeatFromRow, setRepeatFromRow] = useState<number | null>(initialPattern.repeatFromRow)
  const [weftColorSlotId, setWeftColorSlotId] = useState<string | null>(initialPattern.weftColorSlotId)

  const numTablets = threading.length
  const numRows = turningSequence.length

  function addTablet() {
    if (numTablets >= MAX_TABLETS) return
    const defaultColorSlotId = palette[0]?.slotId ?? ''
    setThreading((prev) => [
      ...prev,
      {
        holes: Array.from({ length: initialPattern.holesPerTablet }, () => ({
          colorSlotId: defaultColorSlotId,
        })),
        orientation: 'S',
      },
    ])
    setTurningSequence((prev) => prev.map((row) => [...row, DEFAULT_TURN]))
  }

  function removeTablet() {
    if (numTablets <= MIN_TABLETS) return
    setThreading((prev) => prev.slice(0, -1))
    setTurningSequence((prev) => prev.map((row) => row.slice(0, -1)))
  }

  /** Entfernt genau ein Brettchen an einer beliebigen Position (nicht nur am Ende), siehe "×" unter jeder Spalte in der Schärpatrone. */
  function removeTabletAt(index: number) {
    if (numTablets <= MIN_TABLETS) return
    setThreading((prev) => prev.filter((_, i) => i !== index))
    setTurningSequence((prev) => prev.map((row) => row.filter((_, i) => i !== index)))
  }

  /** Neue Reihen setzen die Drehrichtung jedes Brettchens einfach fort (kein automatischer Wechsel zurück auf vorwärts). */
  function addRow() {
    if (numRows >= MAX_ROWS) return
    setTurningSequence((prev) => {
      const lastRow = prev[prev.length - 1]
      const newRow = lastRow ? [...lastRow] : Array.from({ length: numTablets }, () => DEFAULT_TURN)
      return [...prev, newRow]
    })
  }

  function removeRow() {
    if (numRows <= MIN_ROWS) return
    setTurningSequence((prev) => prev.slice(0, -1))
  }

  function setTabletCount(target: number) {
    const clamped = clamp(target, MIN_TABLETS, MAX_TABLETS)
    const delta = clamped - numTablets
    for (let i = 0; i < delta; i++) addTablet()
    for (let i = 0; i < -delta; i++) removeTablet()
  }

  function setRowCount(target: number) {
    const clamped = clamp(target, MIN_ROWS, MAX_ROWS)
    const delta = clamped - numRows
    for (let i = 0; i < delta; i++) addRow()
    for (let i = 0; i < -delta; i++) removeRow()
  }

  /**
   * Kehrt die Drehrichtung ab (einschließlich) der angeklickten Reihe für
   * dieses Brettchen um – alle folgenden Reihen desselben Brettchens
   * werden mit umgekehrt, alle anderen Brettchen/Reihen bleiben unverändert.
   */
  function invertTurnsFrom(rowIndex: number, tabletIndex: number) {
    setTurningSequence((prev) =>
      prev.map((row, r) => (r >= rowIndex ? row.map((turn, t) => (t === tabletIndex ? -turn : turn)) : row)),
    )
  }

  /**
   * Verschiebt ein Brettchen an eine andere Position (Drag & Drop in der
   * Schärpatrone) – Fädelung UND Wendefolge werden gemeinsam umsortiert,
   * damit sie pro Brettchen zusammen bleiben.
   */
  function moveTablet(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setThreading((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setTurningSequence((prev) =>
      prev.map((row) => {
        const next = [...row]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      }),
    )
  }

  /** Wechselt die Kartenstellung (S/Z) eines einzelnen Brettchens, alle anderen bleiben unverändert. */
  function toggleOrientation(tabletIndex: number) {
    setThreading((prev) =>
      prev.map((tablet, t) =>
        t === tabletIndex ? { ...tablet, orientation: tablet.orientation === 'S' ? 'Z' : 'S' } : tablet,
      ),
    )
  }

  /** Weist einem einzelnen Loch einen Farb-Slot zu, alle anderen Löcher bleiben unverändert. */
  function paintHole(tabletIndex: number, holeIndex: number, colorSlotId: string) {
    setThreading((prev) =>
      prev.map((tablet, t) =>
        t === tabletIndex
          ? { ...tablet, holes: tablet.holes.map((hole, h) => (h === holeIndex ? { ...hole, colorSlotId } : hole)) }
          : tablet,
      ),
    )
  }

  /**
   * Fügt einen neuen Farb-Slot mit automatisch generiertem Namen hinzu, gibt
   * dessen slotId zurück. Gibt es bereits eine gleiche oder sehr ähnliche
   * Farbe in der Palette (siehe isSimilarColor), wird stattdessen deren
   * slotId zurückgegeben, ohne einen neuen Slot anzulegen – so bleibt die
   * Palette frei von kaum unterscheidbaren Doppeleinträgen und die
   * bestehende Farbe wird einfach aktiv.
   */
  function addColor(hex: string): string {
    const duplicate = palette.find((slot) => isSimilarColor(slot.hex, hex))
    if (duplicate) return duplicate.slotId
    const slotId = nextSlotId(palette)
    const name = generateColorName(
      hex,
      palette.map((slot) => slot.name),
      language,
    )
    setPalette((prev) => [...prev, { slotId, name, hex, order: prev.length }])
    return slotId
  }

  /** Ändert den Hex-Wert eines bestehenden Farb-Slots. */
  function setColorHex(slotId: string, hex: string) {
    setPalette((prev) => prev.map((slot) => (slot.slotId === slotId ? { ...slot, hex } : slot)))
  }

  /**
   * Entfernt einen Farb-Slot. Löcher, die diese Farbe verwendet haben,
   * werden auf "leer" gesetzt (leerer colorSlotId, im Muster als X gezeigt) –
   * alle anderen Zellen bleiben unverändert.
   */
  function removeColor(slotId: string) {
    setPalette((prev) => prev.filter((slot) => slot.slotId !== slotId))
    setThreading((prev) =>
      prev.map((tablet) => ({
        ...tablet,
        holes: tablet.holes.map((hole) => (hole.colorSlotId === slotId ? { ...hole, colorSlotId: '' } : hole)),
      })),
    )
    setWeftColorSlotId((prev) => (prev === slotId ? null : prev))
  }

  const pattern: Pattern = {
    ...initialPattern,
    threading,
    turningSequence,
    numTablets,
    numRows,
    defaultPalette: palette,
    title,
    style,
    notes,
    sourceUrl,
    repeatFromRow,
    weftColorSlotId,
  }

  return {
    pattern,
    numTablets,
    numRows,
    minTablets: MIN_TABLETS,
    maxTablets: MAX_TABLETS,
    minRows: MIN_ROWS,
    maxRows: MAX_ROWS,
    setTabletCount,
    setRowCount,
    invertTurnsFrom,
    moveTablet,
    removeTabletAt,
    toggleOrientation,
    palette,
    paintHole,
    addColor,
    setColorHex,
    removeColor,
    title,
    setTitle,
    style,
    setStyle,
    notes,
    setNotes,
    sourceUrl,
    setSourceUrl,
    repeatFromRow,
    setRepeatFromRow,
    weftColorSlotId,
    setWeftColorSlotId,
  }
}
