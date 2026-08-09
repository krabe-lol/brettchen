import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CountControlProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Rein dekoratives Icon hinter dem Label (z. B. Pfeile als Hinweis auf Pfeiltasten-Navigation) – fließt NICHT in die a11y-Beschriftung der +/- Buttons ein, dafür bleibt `label` ein reiner String. */
  labelIcon?: ReactNode
}

export function CountControl({ label, value, min, max, onChange, labelIcon }: CountControlProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {labelIcon}
      </Label>
      <div className="flex items-stretch">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-r-none"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={t('editorCountDecrease', { label })}
        >
          <Minus />
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value)
            if (Number.isFinite(parsed)) onChange(parsed)
          }}
          className="w-16 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-l-none"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={t('editorCountIncrease', { label })}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
