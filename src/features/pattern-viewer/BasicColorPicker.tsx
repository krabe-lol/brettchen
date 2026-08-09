import { useState } from 'react'
import { Check } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { isSimilarColor, localizedBasicColors } from './render/colorNames'

interface BasicColorPickerProps {
  onSelect: (hex: string) => void
  /** Hex values of colors already in the palette - identical/very similar colors aren't offered here. */
  existingHexes?: string[]
}

/**
 * ~8 named basic colors for quick picking above the large color field: a
 * click just sets it as a preselection in the field below, applied - like
 * a freely picked color - only via the "apply" click. The embedded
 * gradient picker (react-colorful) fires onChange continuously while
 * dragging, so applying immediately on every preselection would be
 * impractical anyway. Basic colors already (or very similarly) in the
 * palette are removed from the list; "apply" stays disabled while the
 * current preselection is too similar to an existing color.
 */
export function BasicColorPicker({ onSelect, existingHexes = [] }: BasicColorPickerProps) {
  const { t, language } = useLanguage()
  const [customHex, setCustomHex] = useState('#888888')

  const isDuplicate = (hex: string) => existingHexes.some((existing) => isSimilarColor(existing, hex))
  const availableColors = localizedBasicColors(language).filter((color) => !isDuplicate(color.hex))
  const customIsDuplicate = isDuplicate(customHex)

  return (
    <div className="flex flex-col gap-2">
      {availableColors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {availableColors.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => setCustomHex(color.hex)}
              className="size-6 rounded border"
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={color.name}
            />
          ))}
        </div>
      )}

      <HexColorPicker color={customHex} onChange={setCustomHex} className="!w-full" />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={customIsDuplicate}
        title={customIsDuplicate ? t('colorsDuplicate') : undefined}
        onClick={() => onSelect(customHex)}
      >
        <Check /> {t('colorPickerApply')}
      </Button>
    </div>
  )
}
