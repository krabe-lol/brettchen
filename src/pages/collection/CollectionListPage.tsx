import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { CollectionCard } from '@/features/library/CollectionCard'
import { fetchPublicCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'

/** Public collections from everyone, for browsing and subscribing. */
export function CollectionListPage() {
  const { t } = useLanguage()
  const { user, token } = useAuth()
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setLoadError(null)
    fetchPublicCollections()
      .then(setCollections)
      .catch((err) => setLoadError(err instanceof Error ? err.message : t('profileLoadError')))
      .finally(() => setIsLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('collectionListHeading')}</h1>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : collections.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t('collectionListPlaceholder')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.documentId}
              collection={collection}
              currentUserId={user?.id}
              token={token}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
