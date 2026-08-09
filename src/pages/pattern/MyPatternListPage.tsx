import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { PatternFilterBar } from './PatternFilterBar'
import { usePatternFilters } from './usePatternFilters'
import { fetchMyPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchMyCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'

/** Same as PatternListPage ("all patterns"), but only the user's own patterns (including unpublished drafts). */
export function MyPatternListPage() {
  const { t } = useLanguage()
  const { user, token, isLoading: isAuthLoading } = useAuth()
  const [patterns, setPatterns] = useState<StrapiPatternRecord[]>([])
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const filters = usePatternFilters(patterns)

  const loadCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    fetchMyPatterns(token)
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
  }, [token, t])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  if (isAuthLoading) return null
  if (!user || !token) return <Navigate to="/login" replace />

  return (
    <div className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('myPatternListHeading')}</h1>
        <PatternFilterBar
          idPrefix="my-pattern"
          minTablets={filters.minTablets}
          onMinTabletsChange={filters.setMinTablets}
          maxTablets={filters.maxTablets}
          onMaxTabletsChange={filters.setMaxTablets}
          styleFilter={filters.styleFilter}
          onStyleFilterChange={filters.setStyleFilter}
          styleSuggestions={filters.styleSuggestions}
          twistFilter={filters.twistFilter}
          onTwistFilterChange={filters.setTwistFilter}
        />
      </div>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : filters.filteredPatterns.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t('myPatternListPlaceholder')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filters.filteredPatterns.map((pattern) => (
            <PatternCard
              key={pattern.documentId}
              pattern={pattern}
              collections={collections}
              token={token}
              onCollectionsChanged={loadCollections}
              noStyleLabel={t('profileNoStyle')}
              currentUsername={user.username}
            />
          ))}
        </div>
      )}
    </div>
  )
}
