import { useRef, useState } from 'react'

/** Bulk-selection state for a pattern grid (checkbox per card, see PatternCard) - tracked by documentId. */
export function usePatternSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** Last id toggled by a plain (non-shift) click - the anchor a shift-click range extends from. */
  const anchorRef = useRef<string | null>(null)

  /**
   * Toggles a single card, or - with shiftKey held and a previous plain
   * click to anchor from - selects every card between that anchor and this
   * one (inclusive), in `orderedIds` order (the grid's current, possibly
   * filtered, display order). Matches common file-manager shift-click
   * behavior: the whole range always ends up selected, regardless of each
   * card's previous state - it doesn't toggle them individually.
   */
  function toggle(documentId: string, orderedIds: string[], shiftKey: boolean) {
    const anchor = anchorRef.current
    if (shiftKey && anchor && anchor !== documentId && orderedIds.includes(anchor)) {
      const anchorIndex = orderedIds.indexOf(anchor)
      const targetIndex = orderedIds.indexOf(documentId)
      if (targetIndex !== -1) {
        const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
        const range = orderedIds.slice(start, end + 1)
        setSelected((current) => new Set([...current, ...range]))
        return
      }
    }

    anchorRef.current = documentId
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(documentId)) next.delete(documentId)
      else next.add(documentId)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
    anchorRef.current = null
  }

  /** Adds every given id to the selection (union, never deselects anything already checked). */
  function selectAll(documentIds: string[]) {
    setSelected((current) => new Set([...current, ...documentIds]))
  }

  return { selected, toggle, clear, selectAll, isActive: selected.size > 0 }
}
