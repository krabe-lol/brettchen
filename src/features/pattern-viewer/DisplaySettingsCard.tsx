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
  /** Wenn gesetzt, erscheint unten in der Card ein "Als Standard festlegen"-Button. */
  onSaveAsDefault?: () => void
  isSavingDefault?: boolean
  /** Ohne Login (false) ist der Button deaktiviert und zeigt einen erklärenden Tooltip statt zu speichern. */
  canSaveAsDefault?: boolean
}

/**
 * Rein anzeigeseitige Einstellungen für die Schärpatrone (siehe
 * render/orientationDisplay.ts): ändern nie das gespeicherte Muster,
 * sondern nur, wie Kartenstellung und Lochbeschriftung dargestellt
 * werden. Reihen-/Brettchen-Hervorhebung und Untwist-Modus sind bewusst
 * NICHT hier, sondern in der eigenen PatternHighlightSettingsCard darunter –
 * die gelten pro Muster UND Nutzer:in, nicht global wie diese Card (siehe
 * usePatternHighlightSettings). "Als Standard festlegen" unten betrifft
 * entsprechend nur die Einstellungen in dieser Card.
 */
export function DisplaySettingsCard({
  settings,
  onChange,
  onSaveAsDefault,
  isSavingDefault,
  canSaveAsDefault = true,
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
            <ToggleGroupItem value="clockwise">{t('displaySettingsDirectionClockwise')}</ToggleGroupItem>
            <ToggleGroupItem value="counterclockwise">{t('displaySettingsDirectionCounterclockwise')}</ToggleGroupItem>
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
        {/* Browser unterdrücken das native title-Tooltip auf disabled-Elementen selbst –
            daher hier auf einem umschließenden, nicht-deaktivierten span. */}
        <span title={canSaveAsDefault ? undefined : t('displaySettingsSaveRequiresLogin')} className="inline-block">
          <Button type="button" onClick={onSaveAsDefault} disabled={isSavingDefault || !canSaveAsDefault}>
            {isSavingDefault ? t('editorSaving') : t('displaySettingsSaveAsDefault')}
          </Button>
        </span>
      </CardFooter>
    </Card>
  )
}
