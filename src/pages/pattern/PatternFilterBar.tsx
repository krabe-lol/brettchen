import { useLanguage } from '@/features/i18n/LanguageContext'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/TagInput'
import type { StyleMatchMode, TwistFilter } from './usePatternFilters'

interface PatternFilterBarProps {
  /** Prefixes the input ids so PatternListPage and MyPatternListPage can both render this on the same page without colliding. */
  idPrefix: string
  minTablets: string
  onMinTabletsChange: (value: string) => void
  maxTablets: string
  onMaxTabletsChange: (value: string) => void
  styleFilter: string[]
  onStyleFilterChange: (value: string[]) => void
  styleSuggestions: string[]
  styleMatchMode: StyleMatchMode
  onStyleMatchModeChange: (value: StyleMatchMode) => void
  minColors: string
  onMinColorsChange: (value: string) => void
  maxColors: string
  onMaxColorsChange: (value: string) => void
  twistFilter: TwistFilter
  onTwistFilterChange: (value: TwistFilter) => void
}

/** Shared filter controls for PatternListPage and MyPatternListPage: tablet count range, style tags, colors, twist-neutral toggle. */
export function PatternFilterBar({
  idPrefix,
  minTablets,
  onMinTabletsChange,
  maxTablets,
  onMaxTabletsChange,
  styleFilter,
  onStyleFilterChange,
  styleSuggestions,
  styleMatchMode,
  onStyleMatchModeChange,
  minColors,
  onMinColorsChange,
  maxColors,
  onMaxColorsChange,
  twistFilter,
  onTwistFilterChange,
}: PatternFilterBarProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-8">
      <ToggleGroup
        type="single"
        spacing="none"
        value={twistFilter}
        onValueChange={(value) => value && onTwistFilterChange(value as TwistFilter)}
      >
        <ToggleGroupItem value="all">{t('patternFilterAll')}</ToggleGroupItem>
        <ToggleGroupItem value="neutral">{t('patternFilterTwistNeutral')}</ToggleGroupItem>
        <ToggleGroupItem value="not-neutral">{t('patternFilterNotTwistNeutral')}</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-2">
        <Label htmlFor={`${idPrefix}-style-filter`} className="text-sm text-muted-foreground">
          {t('patternFilterStyleLabel')}
        </Label>
        <div className="flex items-stretch">
          <TagInput
            id={`${idPrefix}-style-filter`}
            value={styleFilter}
            onChange={onStyleFilterChange}
            suggestions={styleSuggestions}
            placeholder={t('patternFilterStylePlaceholder')}
            className="w-56"
            inputClassName="rounded-r-none"
          />
          <Toggle
            variant="outline"
            pressed={styleMatchMode === 'and'}
            onPressedChange={(pressed) => onStyleMatchModeChange(pressed ? 'and' : 'or')}
            className="border-input h-auto rounded-l-none border-l-0"
          >
            {styleMatchMode === 'and' ? t('patternFilterStyleModeAnd') : t('patternFilterStyleModeOr')}
          </Toggle>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor={`${idPrefix}-tablets-min`} className="text-sm text-muted-foreground">
          {t('patternFilterTabletsLabel')}
        </Label>
        <Input
          id={`${idPrefix}-tablets-min`}
          type="number"
          min={1}
          value={minTablets}
          onChange={(e) => onMinTabletsChange(e.target.value)}
          placeholder={t('patternFilterTabletsMinPlaceholder')}
          className="h-8 w-20 text-xs"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          id={`${idPrefix}-tablets-max`}
          type="number"
          min={1}
          value={maxTablets}
          onChange={(e) => onMaxTabletsChange(e.target.value)}
          placeholder={t('patternFilterTabletsMaxPlaceholder')}
          className="h-8 w-20 text-xs"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Label htmlFor={`${idPrefix}-colors-min`} className="text-sm text-muted-foreground">
          {t('patternFilterColorLabel')}
        </Label>
        <Input
          id={`${idPrefix}-colors-min`}
          type="number"
          min={1}
          value={minColors}
          onChange={(e) => onMinColorsChange(e.target.value)}
          placeholder={t('patternFilterColorsMinPlaceholder')}
          className="h-8 w-20 text-xs"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          id={`${idPrefix}-colors-max`}
          type="number"
          min={1}
          value={maxColors}
          onChange={(e) => onMaxColorsChange(e.target.value)}
          placeholder={t('patternFilterColorsMaxPlaceholder')}
          className="h-8 w-20 text-xs"
        />
      </div>
      
    </div>
  )
}
