import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { CollectionCard } from '@/features/library/CollectionCard'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchMyCollections, fetchPublicCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'

/**
 * Öffentliches Profil einer beliebigen Person (auch ohne eigenen Login
 * einsehbar): zeigt nur, was ohnehin öffentlich ist – veröffentlichte
 * Muster und öffentliche Sammlungen dieser Person, gefiltert aus denselben
 * öffentlichen Endpunkten wie die Musterdatenbank/Sammlungsübersicht. Im
 * Gegensatz zu ProfilPage (das eigene Profil) keine Kontoeinstellungen,
 * keine Entwürfe/privaten Sammlungen, keine Abo-Liste.
 */
export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { t } = useLanguage()
  const { user, token } = useAuth()

  const [patterns, setPatterns] = useState<StrapiPatternRecord[]>([])
  const [allCollections, setAllCollections] = useState<StrapiCollectionRecord[]>([])
  const [myCollections, setMyCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMyCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setMyCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([fetchPublishedPatterns(), fetchPublicCollections()])
      .then(([patternData, collectionData]) => {
        if (cancelled) return
        setPatterns(patternData)
        setAllCollections(collectionData)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    loadMyCollections()
  }, [loadMyCollections])

  const myPatterns = useMemo(
    () => patterns.filter((pattern) => pattern.author?.username === username),
    [patterns, username],
  )
  const collections = useMemo(
    () => allCollections.filter((collection) => collection.owner?.username === username),
    [allCollections, username],
  )

  if (isLoading) {
    return (
      <div className="py-12">
        <p className="text-muted-foreground">{t('profileLoading')}</p>
      </div>
    )
  }

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('profileHeading', { username: username ?? '' })}</h1>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t('publicProfilePatternsHeading')}</h2>
        {myPatterns.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t('publicProfileNoPatterns')}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {myPatterns.map((pattern) => (
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
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t('publicProfileCollectionsHeading')}</h2>
        {collections.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t('publicProfileNoCollections')}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.documentId}
                collection={collection}
                currentUserId={user?.id}
                token={token}
                onChanged={loadMyCollections}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
