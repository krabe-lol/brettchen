import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BasicColorPicker } from './BasicColorPicker'
import { computeThreadCounts } from './render/threadCounts'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Pattern, PaletteSlot } from './types'

interface PatternColorEditorCardProps {
  pattern: Pick<Pattern, 'threading'>
  palette: PaletteSlot[]
  activeSlotId: string | null
  onSelectActive: (slotId: string) => void
  onColorHexChange: (slotId: string, hex: string) => void
  onAddColor: (hex: string) => void
  onRemoveColor: (slotId: string) => void
}

/**
 * Spalte "Farben" im Editor: Klick auf eine Farbe wählt sie als aktive
 * Malfarbe (zum Anwenden in der Schärpatrone), der native Farbwähler daneben
 * ändert den Hex-Wert, der ×-Button entfernt die Farbe wieder (betroffene
 * Zellen im Muster werden dann als leer/× dargestellt). Unten: ein
 * "+"-Eintrag im selben Stil wie die Farbliste öffnet ein Overlay mit den
 * Grundfarben und der freien Farbwahl (BasicColorPicker) – bleibt so lange
 * offen, bis daneben geklickt wird, damit sich mehrere Farben nacheinander
 * hinzufügen lassen.
 */
export function PatternColorEditorCard({
  pattern,
  palette,
  activeSlotId,
  onSelectActive,
  onColorHexChange,
  onAddColor,
  onRemoveColor,
}: PatternColorEditorCardProps) {
  const { t } = useLanguage()
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)
  const threadCounts = computeThreadCounts(pattern)

  function formatThreadCount(count: number): string {
    return `${count} ${count === 1 ? t('colorsThreadUnitSingular') : t('colorsThreadUnitPlural')}`
  }

  useEffect(() => {
    if (!addOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [addOpen])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('colorsHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          {t('colorsThreadCountTotalLabel')}: {formatThreadCount(threadCounts.total)}
        </p>
        {palette.map((slot) => (
          <div key={slot.slotId} className="flex items-center gap-1">
            <div
              role="radio"
              aria-checked={slot.slotId === activeSlotId}
              tabIndex={0}
              onClick={() => onSelectActive(slot.slotId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectActive(slot.slotId)
                }
              }}
              className={cn(
                'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
                slot.slotId === activeSlotId
                  ? 'border-ring ring-2 ring-ring/50'
                  : 'border-transparent hover:bg-accent',
              )}
            >
              <input
                type="color"
                value={slot.hex}
                onChange={(e) => onColorHexChange(slot.slotId, e.target.value)}
                className="size-6 shrink-0 cursor-pointer rounded border"
              />
              <span className="flex-1 truncate">{slot.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatThreadCount(threadCounts.bySlot[slot.slotId] ?? 0)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onRemoveColor(slot.slotId)}
              aria-label={t('colorsRemove', { name: slot.name })}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}

        <div ref={addRef} className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            aria-expanded={addOpen}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm transition-colors',
              addOpen ? 'border-ring ring-2 ring-ring/50' : 'border-muted-foreground/30 hover:bg-accent',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded border text-muted-foreground">
              <Plus className="size-3.5" />
            </span>
            <span className="text-muted-foreground">{t('colorsAddHeading')}</span>
          </button>

          {addOpen && (
            <div className="absolute top-full left-0 z-10 mt-1 w-56 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
              <BasicColorPicker onSelect={onAddColor} existingHexes={palette.map((slot) => slot.hex)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
