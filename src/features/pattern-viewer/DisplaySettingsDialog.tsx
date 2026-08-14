import { Highlighter, SlidersHorizontal } from 'lucide-react'
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
  hasDisplayChangesToSave?: boolean
  /**
   * Row/tablet highlighting + untwist mode - only set in read mode
   * (PatternViewer). Deliberately omitted in edit mode (PatternEditor):
   * highlighting shown alongside editing the threading/turning sequence
   * would just be confusing.
   */
  highlightSettings?: PatternHighlightSettings
  onHighlightSettingsChange?: (settings: PatternHighlightSettings) => void
  numRows?: number
  numTablets?: number
}

/**
 * Display options (DisplaySettingsCard) and, if set, row/tablet
 * highlighting + untwist mode (PatternHighlightSettingsCard) each behind
 * their own button as a separate overlay instead of a permanent sidebar -
 * keeps the actual pattern view (diagrams, colors, info) in focus,
 * especially on narrow screens. Two buttons instead of one shared dialog,
 * since the two setting groups are unrelated enough that combining them
 * behind a single "display settings" button was confusing.
 */
export function DisplaySettingsDialog({
  displaySettings,
  onDisplaySettingsChange,
  onSaveAsDefault,
  isSavingDisplayDefault,
  canSaveDisplayDefault,
  hasDisplayChangesToSave,
  highlightSettings,
  onHighlightSettingsChange,
  numRows,
  numTablets,
}: DisplaySettingsDialogProps) {
  const { t } = useLanguage()
  const hasHighlightSettings = highlightSettings && onHighlightSettingsChange

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <SlidersHorizontal />
            {t('displaySettingsHeading')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">{t('displaySettingsHeading')}</DialogTitle>
          <DisplaySettingsCard
            settings={displaySettings}
            onChange={onDisplaySettingsChange}
            onSaveAsDefault={onSaveAsDefault}
            isSavingDefault={isSavingDisplayDefault}
            canSaveAsDefault={canSaveDisplayDefault}
            hasChangesToSave={hasDisplayChangesToSave}
          />
        </DialogContent>
      </Dialog>

      {hasHighlightSettings && (
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <Highlighter />
              {t('highlightSettingsHeading')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogTitle className="sr-only">{t('highlightSettingsHeading')}</DialogTitle>
            <PatternHighlightSettingsCard
              settings={highlightSettings}
              onChange={onHighlightSettingsChange}
              numRows={numRows}
              numTablets={numTablets}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
