import { useLanguage } from '@/features/i18n/LanguageContext'
import { computeThreadCounts } from './render/threadCounts'
import { ColorSwatchPicker } from './ColorSwatchPicker'
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
            <ColorSwatchPicker
              value={slot.hex}
              onChange={(hex) => onSlotColorChange(slot.slotId, hex)}
              label={t('colorsChange', { name: slot.name })}
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
