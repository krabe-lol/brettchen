import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import type { PaletteSlot } from './types'

interface WeftColorSelectorProps {
  palette: PaletteSlot[]
  weftColorSlotId: string | null
  /** Wenn gesetzt, ist die Auswahl klickbar (nur im Editor) – ohne wird nur der aktuelle Wert angezeigt (und bei keinem gesetzten Wert gar nichts). */
  onChange?: (slotId: string | null) => void
}

/**
 * Auswahl der Schussfadenfarbe (Weft) aus den vorhandenen Musterfarben,
 * zwischen Schärmuster und Kartenstellungs-Legende. Anders als die Kettfäden
 * (Schärung) hat der Schussfaden keine feste Zuordnung zu einzelnen Löchern,
 * daher diese eigene, einfache Auswahl statt einer Zelle in der
 * Schärpatrone. Gilt beim Speichern immer als benutzte Farbe (siehe
 * pruneUnusedColors in PatternEditor.tsx), auch wenn sie sonst nirgends in
 * der Schärung vorkommt.
 */
export function WeftColorSelector({ palette, weftColorSlotId, onChange }: WeftColorSelectorProps) {
  const { t } = useLanguage()

  if (!onChange) {
    const selected = palette.find((slot) => slot.slotId === weftColorSlotId)
    if (!selected) return null
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{t('weftColorLabel')}:</span>
        <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: selected.hex }} />
        <span>{selected.name}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t('weftColorLabel')}</span>
      {palette.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('weftColorNoColors')}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('weftColorNone')}
            aria-pressed={weftColorSlotId === null}
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground',
              weftColorSlotId === null ? 'border-ring ring-2 ring-ring/50' : 'border-dashed hover:bg-accent',
            )}
          >
            ×
          </button>
          {palette.map((slot) => (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => onChange(slot.slotId)}
              aria-label={t('weftColorSwatchLabel', { name: slot.name })}
              aria-pressed={slot.slotId === weftColorSlotId}
              title={slot.name}
              className={cn(
                'size-7 shrink-0 cursor-pointer rounded-full border hover:opacity-80',
                slot.slotId === weftColorSlotId ? 'border-ring ring-2 ring-ring/50' : 'border-border',
              )}
              style={{ backgroundColor: slot.hex }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
