import { useMemo, useState } from 'react'
import type { Pattern, PaletteOverride } from './types'

/**
 * Client-only display state for a pattern: color overrides. Never
 * persisted or sent to the server.
 */
export function useDisplayState(pattern: Pattern) {
  const [paletteOverride, setPaletteOverride] = useState<PaletteOverride>({})

  const activePalette = useMemo(() => {
    return pattern.defaultPalette.map((slot) => ({
      ...slot,
      hex: paletteOverride[slot.slotId] ?? slot.hex,
    }))
  }, [pattern.defaultPalette, paletteOverride])

  function setSlotColor(slotId: string, hex: string) {
    setPaletteOverride((prev) => ({ ...prev, [slotId]: hex }))
  }

  function resetColors() {
    setPaletteOverride({})
  }

  return {
    activePalette,
    setSlotColor,
    resetColors,
  }
}
