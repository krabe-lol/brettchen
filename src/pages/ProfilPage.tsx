import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { CollectionCard } from '@/features/library/CollectionCard'
import { CreateCollectionCard } from '@/features/library/CreateCollectionCard'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { fetchMyPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchMyCollections, fetchMySubscriptions, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import { errorMessage } from '@/lib/utils'

export function ProfilPage() {
  const { user, token, isLoading } = useAuth()
  const { t } = useLanguage()

  const [myPatterns, setMyPatterns] = useState<StrapiPatternRecord[]>([])
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true)
  const [patternsError, setPatternsError] = useState<string | null>(null)

  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)

  const [subscriptions, setSubscriptions] = useState<StrapiCollectionRecord[]>([])

  const loadCollections = useCallback(() => {
    if (!token) return
    setIsLoadingCollections(true)
    setCollectionsError(null)
    fetchMyCollections(token)
      .then(setCollections)
      .catch((err) => setCollectionsError(errorMessage(err, t('profileLoadError'))))
      .finally(() => setIsLoadingCollections(false))
  }, [token, t])

  const loadSubscriptions = useCallback(() => {
    if (!token) return
    fetchMySubscriptions(token)
      .then(setSubscriptions)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!user || !token) return
    let cancelled = false
    setIsLoadingPatterns(true)
    setPatternsError(null)
    fetchMyPatterns(token)
      .then((patterns) => {
        if (!cancelled) setMyPatterns(patterns)
      })
      .catch((err) => {
        if (!cancelled) setPatternsError(errorMessage(err, t('profileLoadError')))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPatterns(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, token, t])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  if (isLoading) return null
  if (!user || !token) return <Navigate to="/login" replace />

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('profileHeading', { username: user.username })}</h1>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t('profileMyPatterns')}</h2>
        {isLoadingPatterns ? (
          <p className="mt-2 text-muted-foreground">{t('profileLoading')}</p>
        ) : patternsError ? (
          <p className="mt-2 text-destructive">{patternsError}</p>
        ) : myPatterns.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            {t('profileNoPatterns')}{' '}
            <Link to="/pattern/new" className="underline">
              {t('profileCreateOne')}
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {myPatterns.map((record) => (
              <PatternCard
                key={record.documentId}
                pattern={record}
                collections={collections}
                token={token}
                onCollectionsChanged={loadCollections}
                noStyleLabel={t('profileNoStyle')}
                currentUsername={user?.username}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t('profileCollections')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('profileDefaultCollectionHint')}</p>

        {isLoadingCollections ? (
          <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
        ) : collectionsError ? (
          <p className="mt-4 text-destructive">{collectionsError}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CreateCollectionCard token={token} onCreated={loadCollections} />

            {collections.map((collection) => (
              <CollectionCard
                key={collection.documentId}
                collection={collection}
                currentUserId={user.id}
                token={token}
                onChanged={loadCollections}
              />
            ))}
          </div>
        )}
      </section>

      {subscriptions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{t('profileSubscriptions')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((collection) => (
              <CollectionCard
                key={collection.documentId}
                collection={collection}
                currentUserId={user.id}
                token={token}
                onChanged={loadSubscriptions}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
