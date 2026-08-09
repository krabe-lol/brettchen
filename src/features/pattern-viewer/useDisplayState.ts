import { useMemo, useState } from 'react'
import type { Pattern, PaletteOverride } from './types'

/**
 * Rein clientseitiger Anzeige-State für ein Muster: Farb-Overrides. Wird nie
 * persistiert oder an den Server geschickt.
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
