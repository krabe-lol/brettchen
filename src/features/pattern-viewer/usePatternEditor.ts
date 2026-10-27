import { useState } from 'react'
import { generateColorName, isSimilarColor } from './render/colorNames'
import { hasDirectionChange } from './render/twist'
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

/** Default turn direction for newly added rows/tablets: forward. */
const DEFAULT_TURN = 1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Holds a pattern's threading, turning sequence and palette as editable
 * local state. Tablets/rows/colors are only ever appended/removed at the
 * end or changed at a specific cell - nothing is ever regenerated or
 * overwritten, so an already-configured pattern never gets lost.
 */
export function usePatternEditor(initialPattern: Pattern) {
  const { language } = useLanguage()
  const [threading, setThreading] = useState<TabletThreading[]>(initialPattern.threading)
  const [turningSequence, setTurningSequence] = useState<number[][]>(initialPattern.turningSequence)
  const [holesPerTablet] = useState(initialPattern.holesPerTablet)
  const [palette, setPalette] = useState<PaletteSlot[]>(initialPattern.defaultPalette)
  const [title, setTitle] = useState(initialPattern.title)
  const [style, setStyle] = useState<string[]>(initialPattern.style)
  const [notes, setNotes] = useState(initialPattern.notes)
  const [sourceUrl, setSourceUrl] = useState(initialPattern.sourceUrl)
  const [repeatFromRow, setRepeatFromRow] = useState<number | null>(initialPattern.repeatFromRow)
  const [weftColorSlotId, setWeftColorSlotId] = useState<string | null>(initialPattern.weftColorSlotId)
  /** Per-tablet, parallel to `threading` - kept in sync through every add/remove/move so an exemption always stays on the right tablet. */
  const [twistExempt, setTwistExempt] = useState<boolean[]>(() =>
    initialPattern.threading.map((_, i) => initialPattern.twistExemptTablets.includes(i)),
  )

  const numTablets = threading.length
  const numRows = turningSequence.length

  function addTablet() {
    if (numTablets >= MAX_TABLETS) return
    const defaultColorSlotId = palette[0]?.slotId ?? ''
    setThreading((prev) => [
      ...prev,
      {
        holes: Array.from({ length: holesPerTablet }, () => ({
          colorSlotId: defaultColorSlotId,
        })),
        orientation: 'S',
      },
    ])
    setTurningSequence((prev) => prev.map((row) => [...row, DEFAULT_TURN]))
    setTwistExempt((prev) => [...prev, false])
  }

  function removeTablet() {
    if (numTablets <= MIN_TABLETS) return
    setThreading((prev) => prev.slice(0, -1))
    setTurningSequence((prev) => prev.map((row) => row.slice(0, -1)))
    setTwistExempt((prev) => prev.slice(0, -1))
  }

  /** Removes exactly one tablet at any position (not just the end), see the "x" below each column in the threading chart. */
  function removeTabletAt(index: number) {
    if (numTablets <= MIN_TABLETS) return
    setThreading((prev) => prev.filter((_, i) => i !== index))
    setTurningSequence((prev) => prev.map((row) => row.filter((_, i) => i !== index)))
    setTwistExempt((prev) => prev.filter((_, i) => i !== index))
  }

  /** New rows just continue each tablet's turn direction (no automatic reset back to forward). */
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

  /** Removes exactly one row at any position (not just the end), see the "x" at the end of each row in the turning diagram. */
  function removeRowAt(index: number) {
    if (numRows <= MIN_ROWS) return
    setTurningSequence((prev) => prev.filter((_, i) => i !== index))
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
   * Inverts the turn direction from (and including) the clicked row for
   * this tablet - all following rows of the same tablet flip too, every
   * other tablet/row stays unchanged. No-op for a twist-exempt tablet (see
   * toggleTwistExempt) - its whole point is to keep turning the same way undisturbed.
   */
  function invertTurnsFrom(rowIndex: number, tabletIndex: number) {
    if (twistExempt[tabletIndex]) return
    setTurningSequence((prev) =>
      prev.map((row, r) => (r >= rowIndex ? row.map((turn, t) => (t === tabletIndex ? -turn : turn)) : row)),
    )
  }

  /**
   * Inverts every tablet's turn from (and including) this row on, same
   * cascade as invertTurnsFrom but for all tablets at once instead of just
   * the one clicked - twist-exempt tablets are skipped, same as invertTurnsFrom.
   */
  function invertRow(rowIndex: number) {
    setTurningSequence((prev) =>
      prev.map((row, r) =>
        r >= rowIndex ? row.map((turn, t) => (twistExempt[t] ? turn : -turn)) : row,
      ),
    )
  }

  /**
   * Moves a tablet to another position (drag & drop in the threading
   * chart) - threading AND turning sequence are reordered together, so
   * they stay paired per tablet.
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
    setTwistExempt((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  /** Moves a row to another position (drag & drop in the turning diagram). */
  function moveRow(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setTurningSequence((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  /** Toggles the card orientation (S/Z) of a single tablet, all others stay unchanged. */
  function toggleOrientation(tabletIndex: number) {
    setThreading((prev) =>
      prev.map((tablet, t) =>
        t === tabletIndex ? { ...tablet, orientation: tablet.orientation === 'S' ? 'Z' : 'S' } : tablet,
      ),
    )
  }

  /**
   * Excludes a tablet from the twist-neutrality check (see render/twist.ts)
   * - only allowed while the tablet hasn't changed direction yet (see
   * hasDirectionChange), typically a border tablet meant to just keep
   * turning the same way. Once exempt, its cells stop reacting to clicks/
   * drag/row-invert (see invertTurnsFrom/invertRow), so it can't
   * accidentally change direction afterward either. Un-exempting is
   * always allowed; turning exemption on is silently ignored for a
   * tablet that has already changed direction.
   */
  function toggleTwistExempt(tabletIndex: number) {
    setTwistExempt((prev) => {
      if (!prev[tabletIndex] && hasDirectionChange(turningSequence, tabletIndex)) return prev
      return prev.map((exempt, t) => (t === tabletIndex ? !exempt : exempt))
    })
  }

  /** Assigns a color slot to a single hole, all other holes stay unchanged. */
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
   * Adds a new color slot with an auto-generated name, returns its slotId.
   * If the palette already has an identical or very similar color (see
   * isSimilarColor), returns that slot's id instead without creating a new
   * one - keeps the palette free of near-indistinguishable duplicates and
   * just activates the existing color.
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

  /** Changes the hex value of an existing color slot and regenerates its name to match, same as a newly added color. */
  function setColorHex(slotId: string, hex: string) {
    setPalette((prev) => {
      const otherNames = prev.filter((slot) => slot.slotId !== slotId).map((slot) => slot.name)
      const name = generateColorName(hex, otherNames, language)
      return prev.map((slot) => (slot.slotId === slotId ? { ...slot, hex, name } : slot))
    })
  }

  /**
   * Removes a color slot. Holes that used this color are set to "empty"
   * (empty colorSlotId, shown as X in the pattern) - all other cells stay
   * unchanged.
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

  const twistExemptTablets = twistExempt.flatMap((exempt, i) => (exempt ? [i] : []))

  const pattern: Pattern = {
    ...initialPattern,
    threading,
    turningSequence,
    holesPerTablet,
    numTablets,
    numRows,
    defaultPalette: palette,
    title,
    style,
    notes,
    sourceUrl,
    repeatFromRow,
    weftColorSlotId,
    twistExemptTablets,
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
    invertRow,
    moveTablet,
    moveRow,
    removeTabletAt,
    removeRowAt,
    toggleOrientation,
    toggleTwistExempt,
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
