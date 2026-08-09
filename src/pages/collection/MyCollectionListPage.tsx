import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { CollectionCard } from '@/features/library/CollectionCard'
import { CreateCollectionCard } from '@/features/library/CreateCollectionCard'
import { fetchMyCollections, fetchMySubscriptions, type StrapiCollectionRecord } from '@/lib/strapi/collections'

/** Same as CollectionListPage ("all collections"), but only the user's own collections (including private) plus subscribed ones. */
export function MyCollectionListPage() {
  const { t } = useLanguage()
  const { user, token, isLoading: isAuthLoading } = useAuth()
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [subscriptions, setSubscriptions] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    Promise.all([fetchMyCollections(token), fetchMySubscriptions(token)])
      .then(([mine, subscribed]) => {
        setCollections(mine)
        setSubscriptions(subscribed)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : t('profileLoadError')))
      .finally(() => setIsLoading(false))
  }, [token, t])

  useEffect(() => {
    load()
  }, [load])

  if (isAuthLoading) return null
  if (!user || !token) return <Navigate to="/login" replace />

  const allCollections = [...collections, ...subscriptions]

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('myCollectionListHeading')}</h1>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <CreateCollectionCard token={token} onCreated={load} />
          {allCollections.map((collection) => (
            <CollectionCard
              key={collection.documentId}
              collection={collection}
              currentUserId={user.id}
              token={token}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
