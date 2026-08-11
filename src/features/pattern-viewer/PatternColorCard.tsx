import { useLanguage } from '@/features/i18n/LanguageContext'
import { computeThreadCounts } from './render/threadCounts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Pattern, PaletteSlot } from './types'

interface PatternColorCardProps {
  pattern: Pick<Pattern, 'threading'>
  palette: PaletteSlot[]
  onSlotColorChange: (slotId: string, hex: string) => void
  onReset: () => void
}

/** "Colors" column: color pick per palette slot, client-only. Also shows how many threads are needed in total and per color (see render/threadCounts.ts). */
export function PatternColorCard({ pattern, palette, onSlotColorChange, onReset }: PatternColorCardProps) {
  const { t } = useLanguage()
  const threadCounts = computeThreadCounts(pattern)

  function formatThreadCount(count: number): string {
    return `${count} ${count === 1 ? t('colorsThreadUnitSingular') : t('colorsThreadUnitPlural')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('colorsHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {palette.map((slot) => (
          <Label key={slot.slotId} className="justify-start gap-2 font-normal">
            <input
              type="color"
              value={slot.hex}
              onChange={(e) => onSlotColorChange(slot.slotId, e.target.value)}
              className="size-6 shrink-0 cursor-pointer appearance-none rounded border p-0 [&::-moz-color-swatch]:rounded-[3px] [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
            />
            <span className="flex flex-1 flex-col truncate">
              <span className="truncate">{slot.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatThreadCount(threadCounts.bySlot[slot.slotId] ?? 0)}
              </span>
            </span>
          </Label>
        ))}
        <p className="text-xs text-muted-foreground">
          {t('colorsThreadCountTotalLabel')}: {formatThreadCount(threadCounts.total)}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          {t('colorsReset')}
        </Button>
      </CardContent>
    </Card>
  )
}
