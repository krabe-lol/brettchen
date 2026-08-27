import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useTranslatedSearchTerms } from '@/lib/useTranslatedSearchTerms'
import { rankBySearchRelevance } from '@/lib/fuzzyMatch'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { CollectionCard } from '@/features/library/CollectionCard'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchMyCollections, fetchPublicCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import { errorMessage } from '@/lib/utils'

/** Results page for the header search bar: searches pattern titles, collection titles, and style tags. */
export function SearchResultsPage() {
  const { t } = useLanguage()
  const { user, token } = useAuth()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [patterns, setPatterns] = useState<StrapiPatternRecord[]>([])
  const [publicCollections, setPublicCollections] = useState<StrapiCollectionRecord[]>([])
  const [myCollections, setMyCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadMyCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setMyCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    Promise.all([fetchPublishedPatterns(), fetchPublicCollections()])
      .then(([patternData, collectionData]) => {
        if (cancelled) return
        setPatterns(patternData)
        setPublicCollections(collectionData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, t('profileLoadError')))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    loadMyCollections()
  }, [loadMyCollections])

  const searchTerms = useTranslatedSearchTerms(query)

  const matchedPatterns = useMemo(() => {
    if (searchTerms.length === 0) return []
    return rankBySearchRelevance(patterns, searchTerms, (pattern) => [pattern.title, ...(pattern.style ?? [])])
  }, [patterns, searchTerms])

  const matchedCollections = useMemo(() => {
    if (searchTerms.length === 0) return []
    return rankBySearchRelevance(publicCollections, searchTerms, (collection) => [collection.name])
  }, [publicCollections, searchTerms])

  const hasResults = matchedPatterns.length > 0 || matchedCollections.length > 0

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('searchResultsHeading')}</h1>
      <p className="mt-1 text-muted-foreground">{t('searchResultsFor').replace('{query}', query)}</p>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : !hasResults ? (
        <p className="mt-4 text-muted-foreground">{t('headerSearchNoResults')}</p>
      ) : (
        <>
          {matchedPatterns.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-medium">{t('headerSearchResultsPatterns')}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {matchedPatterns.map((pattern) => (
                  <PatternCard
                    key={pattern.documentId}
                    pattern={pattern}
                    collections={user ? myCollections : undefined}
                    token={token}
                    onCollectionsChanged={loadMyCollections}
                    noStyleLabel={t('profileNoStyle')}
                    currentUsername={user?.username}
                  />
                ))}
              </div>
            </section>
          )}
          {matchedCollections.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-medium">{t('headerSearchResultsCollections')}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {matchedCollections.map((collection) => (
                  <CollectionCard
                    key={collection.documentId}
                    collection={collection}
                    currentUserId={user?.id}
                    token={token}
                    onChanged={loadMyCollections}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
