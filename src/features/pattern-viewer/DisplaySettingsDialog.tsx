import { SlidersHorizontal } from 'lucide-react'
import { DisplaySettingsCard } from './DisplaySettingsCard'
import { PatternHighlightSettingsCard } from './PatternHighlightSettingsCard'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { PatternHighlightSettings } from '@/lib/strapi/patternPreferences'
import type { DisplaySettings } from './render/orientationDisplay'

interface DisplaySettingsDialogProps {
  displaySettings: DisplaySettings
  onDisplaySettingsChange: (settings: DisplaySettings) => void
  onSaveAsDefault?: () => void
  isSavingDisplayDefault?: boolean
  canSaveDisplayDefault?: boolean
  /**
   * Reihen-/Brettchen-Hervorhebung + Untwist-Modus – nur im Lesemodus
   * (PatternViewer) gesetzt. Im Bearbeiten-Modus (PatternEditor) bewusst
   * weggelassen: beim Bearbeiten der Schärung/Drehfolge wäre eine parallel
   * eingeblendete Hervorhebung nur verwirrend.
   */
  highlightSettings?: PatternHighlightSettings
  onHighlightSettingsChange?: (settings: PatternHighlightSettings) => void
  highlightSaveEnabled?: boolean
  onHighlightSaveEnabledChange?: (enabled: boolean) => void
  canSaveHighlight?: boolean
  numRows?: number
  numTablets?: number
}

/**
 * Anzeigeoptionen (DisplaySettingsCard) und, sofern gesetzt, Reihen-/
 * Brettchen-Hervorhebung + Untwist-Modus (PatternHighlightSettingsCard)
 * hinter einem Button als Overlay statt als dauerhafte Seitenspalte – hält
 * die eigentliche Mustereinsicht (Diagramme, Farben, Infos) im Fokus,
 * besonders auf schmalen Bildschirmen.
 */
export function DisplaySettingsDialog({
  displaySettings,
  onDisplaySettingsChange,
  onSaveAsDefault,
  isSavingDisplayDefault,
  canSaveDisplayDefault,
  highlightSettings,
  onHighlightSettingsChange,
  highlightSaveEnabled,
  onHighlightSaveEnabledChange,
  canSaveHighlight,
  numRows,
  numTablets,
}: DisplaySettingsDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <SlidersHorizontal />
          {t('displaySettingsHeading')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">{t('displaySettingsHeading')}</DialogTitle>
        <div className="flex flex-col gap-6">
          <DisplaySettingsCard
            settings={displaySettings}
            onChange={onDisplaySettingsChange}
            onSaveAsDefault={onSaveAsDefault}
            isSavingDefault={isSavingDisplayDefault}
            canSaveAsDefault={canSaveDisplayDefault}
          />
          {highlightSettings && onHighlightSettingsChange && onHighlightSaveEnabledChange && (
            <PatternHighlightSettingsCard
              settings={highlightSettings}
              onChange={onHighlightSettingsChange}
              saveEnabled={highlightSaveEnabled ?? false}
              onSaveEnabledChange={onHighlightSaveEnabledChange}
              canSave={canSaveHighlight ?? false}
              numRows={numRows}
              numTablets={numTablets}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
