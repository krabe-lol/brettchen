import { useEffect, useRef, useState } from 'react'
import { Ban, Plus, X } from 'lucide-react'
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

/** Sentinel for "no color" - same empty colorSlotId a hole gets when its color is removed from the palette. */
const EMPTY_SLOT_ID = ''

/**
 * "Colors" column in the editor: clicking a color selects it as the active
 * paint color (to apply in the threading chart), the native color picker
 * next to it changes the hex value, the x button removes the color again
 * (affected cells in the pattern then show as empty/x). A fixed "no
 * thread" entry above the palette selects the same empty state directly,
 * for deliberately leaving a hole unthreaded without removing a whole
 * color. Below the palette: a "+" entry in the same style opens an
 * overlay with the basic colors and free color picking (BasicColorPicker)
 * - stays open until clicked elsewhere, so several colors can be added in a row.
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
        <div
          role="radio"
          aria-checked={activeSlotId === EMPTY_SLOT_ID}
          tabIndex={0}
          onClick={() => onSelectActive(EMPTY_SLOT_ID)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectActive(EMPTY_SLOT_ID)
            }
          }}
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
            activeSlotId === EMPTY_SLOT_ID ? 'border-ring ring-2 ring-ring/50' : 'border-transparent hover:bg-accent',
          )}
        >
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded border text-muted-foreground',
              activeSlotId !== EMPTY_SLOT_ID && 'group-hover:text-accent-foreground',
            )}
          >
            <Ban className="size-3.5" />
          </span>
          <span
            className={cn('text-muted-foreground', activeSlotId !== EMPTY_SLOT_ID && 'group-hover:text-accent-foreground')}
          >
            {t('colorsEmptyLabel')}
          </span>
        </div>
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
                'group flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
                slot.slotId === activeSlotId
                  ? 'border-ring ring-2 ring-ring/50'
                  : 'border-transparent hover:bg-accent',
              )}
            >
              <input
                type="color"
                value={slot.hex}
                onChange={(e) => onColorHexChange(slot.slotId, e.target.value)}
                className="size-6 shrink-0 cursor-pointer appearance-none rounded border p-0 [&::-moz-color-swatch]:rounded-[3px] [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
              />
              <span
                className={cn(
                  'flex flex-1 flex-col truncate',
                  slot.slotId !== activeSlotId && 'group-hover:text-accent-foreground',
                )}
              >
                <span className="truncate">{slot.name}</span>
                <span className="text-xs text-muted-foreground group-hover:text-inherit">
                  {formatThreadCount(threadCounts.bySlot[slot.slotId] ?? 0)}
                </span>
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
              'group flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm transition-colors',
              addOpen ? 'border-ring ring-2 ring-ring/50' : 'border-muted-foreground/30 hover:bg-accent',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded border text-muted-foreground',
                !addOpen && 'group-hover:text-accent-foreground',
              )}
            >
              <Plus className="size-3.5" />
            </span>
            <span className={cn('text-muted-foreground', !addOpen && 'group-hover:text-accent-foreground')}>
              {t('colorsAddHeading')}
            </span>
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
