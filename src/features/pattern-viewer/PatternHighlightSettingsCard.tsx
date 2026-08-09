import { SquareArrowDown, SquareArrowLeft, SquareArrowRight, SquareArrowUp } from 'lucide-react'
import { CountControl } from './CountControl'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { PatternHighlightSettings } from '@/lib/strapi/patternPreferences'

interface PatternHighlightSettingsCardProps {
  settings: PatternHighlightSettings
  onChange: (settings: PatternHighlightSettings) => void
  saveEnabled: boolean
  onSaveEnabledChange: (enabled: boolean) => void
  /** Ohne Login oder ohne bereits gespeichertes Muster ist der Speichern-Schalter deaktiviert (siehe usePatternHighlightSettings). */
  canSave: boolean
  numRows?: number
  numTablets?: number
}

/**
 * Eigene Card unterhalb der Anzeigeoptionen: Reihen-/Brettchen-Hervorhebung
 * und Untwist-Modus (siehe PatternDiagrams-Navigation). Anders als die
 * Anzeigeoptionen gelten diese Werte pro Muster UND Nutzer:in – "Als
 * Standard festlegen" in den Anzeigeoptionen betrifft diese Card bewusst
 * NICHT. Der "Für dieses Muster speichern"-Schalter unten (Standard: aus)
 * entscheidet, ob Änderungen hier überhaupt persistiert werden, siehe
 * usePatternHighlightSettings.
 */
export function PatternHighlightSettingsCard({
  settings,
  onChange,
  saveEnabled,
  onSaveEnabledChange,
  canSave,
  numRows = 2000,
  numTablets = 200,
}: PatternHighlightSettingsCardProps) {
  const { t } = useLanguage()

  function set<K extends keyof PatternHighlightSettings>(key: K, value: PatternHighlightSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('highlightSettingsHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="highlight-tablet" className="cursor-pointer">
            {t('displaySettingsHighlightTabletLabel')}
          </Label>
          <Switch
            id="highlight-tablet"
            checked={settings.highlightTablet}
            onCheckedChange={(checked) => set('highlightTablet', checked)}
          />
        </div>
        {settings.highlightTablet && (
          <CountControl
            label={t('displaySettingsActiveTabletLabel')}
            labelIcon={
              <>
                <SquareArrowLeft className="text-muted-foreground size-3.5" />
                <SquareArrowRight className="text-muted-foreground size-3.5" />
              </>
            }
            value={settings.activeTablet}
            min={1}
            max={numTablets}
            onChange={(value) => set('activeTablet', value)}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="highlight-row" className="cursor-pointer">
            {t('displaySettingsHighlightRowLabel')}
          </Label>
          <Switch
            id="highlight-row"
            checked={settings.highlightRow}
            onCheckedChange={(checked) => set('highlightRow', checked)}
          />
        </div>
        {settings.highlightRow && (
          <CountControl
            label={t('displaySettingsActiveRowLabel')}
            labelIcon={
              <>
                <SquareArrowUp className="text-muted-foreground size-3.5" />
                <SquareArrowDown className="text-muted-foreground size-3.5" />
              </>
            }
            value={settings.activeRow}
            min={1}
            max={numRows}
            onChange={(value) => set('activeRow', value)}
          />
        )}

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="untwist-mode" className="cursor-pointer">
              {t('displaySettingsUntwistLabel')}
            </Label>
            <Switch
              id="untwist-mode"
              checked={settings.untwistMode}
              onCheckedChange={(checked) => set('untwistMode', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('displaySettingsUntwistHint')}</p>
        </div>
      </CardContent>
      <CardFooter>
        {/* Browser unterdrücken das native title-Tooltip auf disabled-Elementen selbst –
            daher hier auf einem umschließenden, nicht-deaktivierten span. */}
        <span title={canSave ? undefined : t('highlightSettingsSaveUnavailable')} className="inline-block">
          <div className="flex items-center gap-2">
            <Switch
              id="highlight-save"
              checked={saveEnabled}
              onCheckedChange={onSaveEnabledChange}
              disabled={!canSave}
            />
            <Label htmlFor="highlight-save" className={cn(canSave && 'cursor-pointer')}>
              {t('highlightSettingsSaveLabel')}
            </Label>
          </div>
        </span>
      </CardFooter>
    </Card>
  )
}
