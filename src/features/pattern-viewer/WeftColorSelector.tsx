import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import type { PaletteSlot } from './types'

interface WeftColorSelectorProps {
  palette: PaletteSlot[]
  weftColorSlotId: string | null
  /** If set, the selector is clickable (editor only) - without it, only the current value is shown (and nothing if none is set). */
  onChange?: (slotId: string | null) => void
}

/**
 * Weft color picker from the pattern's existing colors, between the
 * threading chart and the card-orientation legend. Unlike the warp
 * threads (threading), the weft has no fixed assignment to individual
 * holes, hence this separate, simple selector instead of a threading
 * chart cell. Always counts as a used color on save (see
 * pruneUnusedColors in PatternEditor.tsx), even if it doesn't otherwise
 * appear in the threading.
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
              weftColorSlotId === null
                ? 'border-ring ring-2 ring-ring/50'
                : 'border-dashed hover:bg-accent hover:text-accent-foreground',
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
