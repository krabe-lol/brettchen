import { useState } from 'react'
import { Check } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { isSimilarColor, localizedBasicColors } from './render/colorNames'

interface BasicColorPickerProps {
  onSelect: (hex: string) => void
  /** Hex-Werte der bereits in der Palette vorhandenen Farben – gleiche/sehr ähnliche Farben werden hier gar nicht erst angeboten. */
  existingHexes?: string[]
}

/**
 * ~8 benannte Grundfarben zur schnellen Auswahl über dem großen Farbfeld:
 * ein Klick übernimmt die Farbe nur als Vorauswahl im Farbfeld darunter,
 * angewendet wird sie – wie eine frei gewählte Farbe auch – erst per
 * "Übernehmen"-Klick. Der eingebettete Farbverlauf-Picker (react-colorful)
 * feuert beim Ziehen laufend onChange-Events, ein sofortiges Anwenden bei
 * jeder Vorauswahl wäre also ohnehin unpraktisch. Grundfarben, die bereits
 * (oder sehr ähnlich) in der Palette sind, werden aus der Liste entfernt;
 * "Übernehmen" bleibt deaktiviert, solange die aktuelle Vorauswahl einer
 * bestehenden Farbe zu ähnlich ist.
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
