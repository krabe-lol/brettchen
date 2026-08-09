import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { collectStyleTags, fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchMyCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/TagInput'

type TwistFilter = 'all' | 'neutral' | 'not-neutral'

export function PatternListPage() {
  const { t } = useLanguage()
  const { user, token } = useAuth()
  const [patterns, setPatterns] = useState<StrapiPatternRecord[]>([])
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [twistFilter, setTwistFilter] = useState<TwistFilter>('all')
  const [minTablets, setMinTablets] = useState('')
  const [maxTablets, setMaxTablets] = useState('')
  const [searchParams] = useSearchParams()
  const [styleFilter, setStyleFilter] = useState<string[]>(() => {
    const style = searchParams.get('style')
    return style ? [style] : []
  })

  const loadCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    fetchPublishedPatterns()
      .then((data) => {
        if (!cancelled) setPatterns(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : t('profileLoadError'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const styleSuggestions = useMemo(() => collectStyleTags(patterns), [patterns])

  const filteredPatterns = patterns.filter((pattern) => {
    if (twistFilter === 'neutral' && !pattern.isTwistNeutral) return false
    if (twistFilter === 'not-neutral' && pattern.isTwistNeutral) return false
    if (minTablets !== '' && pattern.numTablets < Number(minTablets)) return false
    if (maxTablets !== '' && pattern.numTablets > Number(maxTablets)) return false
    // Muster mit mindestens einem der gewählten Stil-Tags (nicht allen).
    if (styleFilter.length > 0 && !styleFilter.some((tag) => pattern.style?.includes(tag))) return false
    return true
  })

  return (
    <div className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('patternListHeading')}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="tablets-min" className="text-sm text-muted-foreground">
              {t('patternFilterTabletsLabel')}
            </Label>
            <Input
              id="tablets-min"
              type="number"
              min={1}
              value={minTablets}
              onChange={(e) => setMinTablets(e.target.value)}
              placeholder={t('patternFilterTabletsMinPlaceholder')}
              className="h-8 w-20 text-xs"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              id="tablets-max"
              type="number"
              min={1}
              value={maxTablets}
              onChange={(e) => setMaxTablets(e.target.value)}
              placeholder={t('patternFilterTabletsMaxPlaceholder')}
              className="h-8 w-20 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="style-filter" className="text-sm text-muted-foreground">
              {t('patternFilterStyleLabel')}
            </Label>
            <TagInput
              id="style-filter"
              value={styleFilter}
              onChange={setStyleFilter}
              suggestions={styleSuggestions}
              placeholder={t('patternFilterStylePlaceholder')}
              className="w-56"
            />
          </div>
          <ToggleGroup
            type="single"
            spacing="none"
            value={twistFilter}
            onValueChange={(value) => value && setTwistFilter(value as TwistFilter)}
          >
            <ToggleGroupItem value="all">{t('patternFilterAll')}</ToggleGroupItem>
            <ToggleGroupItem value="neutral">{t('patternFilterTwistNeutral')}</ToggleGroupItem>
            <ToggleGroupItem value="not-neutral">{t('patternFilterNotTwistNeutral')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : filteredPatterns.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t('patternListPlaceholder')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPatterns.map((pattern) => (
            <PatternCard
              key={pattern.documentId}
              pattern={pattern}
              collections={user ? collections : undefined}
              token={token}
              onCollectionsChanged={loadCollections}
              noStyleLabel={t('profileNoStyle')}
              currentUsername={user?.username}
            />
          ))}
        </div>
      )}
    </div>
  )
}
