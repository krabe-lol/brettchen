import { useState } from 'react'

/** Bulk-selection state for a pattern grid (checkbox per card, see PatternCard) - tracked by documentId. */
export function usePatternSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(documentId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(documentId)) next.delete(documentId)
      else next.add(documentId)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
  }

  /** Adds every given id to the selection (union, never deselects anything already checked). */
  function selectAll(documentIds: string[]) {
    setSelected((current) => new Set([...current, ...documentIds]))
  }

  return { selected, toggle, clear, selectAll, isActive: selected.size > 0 }
}
