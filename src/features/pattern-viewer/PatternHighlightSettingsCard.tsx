import { SquareArrowDown, SquareArrowLeft, SquareArrowRight, SquareArrowUp } from 'lucide-react'
import { CountControl } from './CountControl'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { PatternHighlightSettings } from '@/lib/strapi/patternPreferences'

interface PatternHighlightSettingsCardProps {
  settings: PatternHighlightSettings
  onChange: (settings: PatternHighlightSettings) => void
  numRows?: number
  numTablets?: number
}

/**
 * Separate card below the display options: row/tablet highlighting and
 * untwist mode (see PatternDiagrams navigation). Unlike the display
 * options, these values apply per pattern AND user - "set as default" in
 * the display options deliberately does NOT cover this card. The active
 * row/tablet position and untwist mode save automatically (see
 * usePatternHighlightSettings); the on/off switches below are
 * deliberately session-only and never saved, so opening a pattern always
 * starts with highlighting off.
 */
export function PatternHighlightSettingsCard({
  settings,
  onChange,
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
    </Card>
  )
}
