import { useLanguage } from '@/features/i18n/LanguageContext'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/TagInput'
import type { TwistFilter } from './usePatternFilters'

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
  twistFilter: TwistFilter
  onTwistFilterChange: (value: TwistFilter) => void
}

/** Shared filter controls for PatternListPage and MyPatternListPage: tablet count range, style tags, twist-neutral toggle. */
export function PatternFilterBar({
  idPrefix,
  minTablets,
  onMinTabletsChange,
  maxTablets,
  onMaxTabletsChange,
  styleFilter,
  onStyleFilterChange,
  styleSuggestions,
  twistFilter,
  onTwistFilterChange,
}: PatternFilterBarProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-4">
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
        <Label htmlFor={`${idPrefix}-style-filter`} className="text-sm text-muted-foreground">
          {t('patternFilterStyleLabel')}
        </Label>
        <TagInput
          id={`${idPrefix}-style-filter`}
          value={styleFilter}
          onChange={onStyleFilterChange}
          suggestions={styleSuggestions}
          placeholder={t('patternFilterStylePlaceholder')}
          className="w-56"
        />
      </div>
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
    </div>
  )
}
