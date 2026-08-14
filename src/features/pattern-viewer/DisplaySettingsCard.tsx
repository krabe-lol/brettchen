import { RotateCcw, RotateCw } from 'lucide-react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { applyNotationChoice, notationChoiceFor } from './render/orientationDisplay'
import type {
  DisplaySettings,
  HoleLabelDirection,
  HoleLabelFacing,
  HoleLabelNotation,
  NotationChoice,
  WeaveCellShape,
} from './render/orientationDisplay'

interface DisplaySettingsCardProps {
  settings: DisplaySettings
  onChange: (settings: DisplaySettings) => void
  /** If set, shows a "set as default" button at the bottom of the card. */
  onSaveAsDefault?: () => void
  isSavingDefault?: boolean
  /** Without login (false), the button is disabled and shows an explanatory tooltip instead of saving. */
  canSaveAsDefault?: boolean
  /** Disables the button (no tooltip) while the settings still match the already-saved default - nothing to save yet. */
  hasChangesToSave?: boolean
}

/**
 * Purely display-side settings for the threading chart (see
 * render/orientationDisplay.ts): never change the saved pattern, only how
 * card orientation and hole labels are displayed. Row/tablet highlighting
 * and untwist mode are deliberately NOT here but in the separate
 * PatternHighlightSettingsCard below - those apply per pattern AND user,
 * not globally like this card (see usePatternHighlightSettings). "Set as
 * default" below accordingly only covers this card's settings.
 */
export function DisplaySettingsCard({
  settings,
  onChange,
  onSaveAsDefault,
  isSavingDefault,
  canSaveAsDefault = true,
  hasChangesToSave = true,
}: DisplaySettingsCardProps) {
  const { t } = useLanguage()

  function set<K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('displaySettingsHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>{t('displaySettingsNotationLabel')}</Label>
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            value={notationChoiceFor(settings)}
            onValueChange={(value) => value && onChange(applyNotationChoice(settings, value as NotationChoice))}
          >
            <ToggleGroupItem value="sz-thread">{t('displaySettingsNotationSzThread')}</ToggleGroupItem>
            <ToggleGroupItem value="sz-tablet">{t('displaySettingsNotationSzTablet')}</ToggleGroupItem>
            <ToggleGroupItem value="slash-tablet">{t('displaySettingsNotationSlashTablet')}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label>{t('displaySettingsHoleNotationLabel')}</Label>
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            value={settings.holeLabelNotation}
            onValueChange={(value) => value && set('holeLabelNotation', value as HoleLabelNotation)}
          >
            <ToggleGroupItem value="hovu">{t('displaySettingsHoleNotationHovu')}</ToggleGroupItem>
            <ToggleGroupItem value="letters">{t('displaySettingsHoleNotationLetters')}</ToggleGroupItem>
            <ToggleGroupItem value="numbers">{t('displaySettingsHoleNotationNumbers')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t('displaySettingsDirectionLabel')}</Label>
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            disabled={settings.holeLabelNotation === 'hovu'}
            value={settings.holeLabelNotation === 'hovu' ? 'clockwise' : settings.holeLabelDirection}
            onValueChange={(value) => value && set('holeLabelDirection', value as HoleLabelDirection)}
          >
            <ToggleGroupItem
              value="clockwise"
              title={t('displaySettingsDirectionClockwise')}
              aria-label={t('displaySettingsDirectionClockwise')}
            >
              <RotateCw />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="counterclockwise"
              title={t('displaySettingsDirectionCounterclockwise')}
              aria-label={t('displaySettingsDirectionCounterclockwise')}
            >
              <RotateCcw />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t('displaySettingsFacingLabel')}</Label>
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            value={settings.holeLabelFacing}
            onValueChange={(value) => value && set('holeLabelFacing', value as HoleLabelFacing)}
          >
            <ToggleGroupItem value="left">{t('displaySettingsFacingLeft')}</ToggleGroupItem>
            <ToggleGroupItem value="right">{t('displaySettingsFacingRight')}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label>{t('displaySettingsWeaveCellShapeLabel')}</Label>
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            value={settings.weaveCellShape}
            onValueChange={(value) => value && set('weaveCellShape', value as WeaveCellShape)}
          >
            <ToggleGroupItem value="ellipse">{t('displaySettingsWeaveCellShapeEllipse')}</ToggleGroupItem>
            <ToggleGroupItem value="square">{t('displaySettingsWeaveCellShapeSquare')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="backward-contrast">{t('displaySettingsBackwardContrastLabel')}</Label>
          <Slider
            id="backward-contrast"
            min={0}
            max={100}
            step={1}
            value={[settings.backwardContrast]}
            onValueChange={([value]) => set('backwardContrast', value)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="center-line" className="cursor-pointer">
            {t('displaySettingsCenterLineLabel')}
          </Label>
          <Switch
            id="center-line"
            checked={settings.showCenterLine}
            onCheckedChange={(checked) => set('showCenterLine', checked)}
          />
        </div>
      </CardContent>
      <CardFooter>
        {/* Browsers suppress the native title tooltip on disabled elements themselves, hence the wrapping, non-disabled span. */}
        <span title={canSaveAsDefault ? undefined : t('displaySettingsSaveRequiresLogin')} className="inline-block">
          <Button
            type="button"
            onClick={onSaveAsDefault}
            disabled={isSavingDefault || !canSaveAsDefault || !hasChangesToSave}
          >
            {isSavingDefault ? t('editorSaving') : t('displaySettingsSaveAsDefault')}
          </Button>
        </span>
      </CardFooter>
    </Card>
  )
}
