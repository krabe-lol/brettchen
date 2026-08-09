import { CollectionThumbnail } from './CollectionThumbnail'
import { CollectionSubscribeButton } from './CollectionSubscribeButton'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { ThumbnailCard } from '@/components/ThumbnailCard'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'

interface CollectionCardProps {
  collection: StrapiCollectionRecord
  /** Eingeloggte Person, um Besitz und Abo-Status zu bestimmen. */
  currentUserId?: number | null
  token?: string | null
  /** Wird nach erfolgreichem Abonnieren/Kündigen aufgerufen (z. B. um die Liste neu zu laden). */
  onChanged?: () => void
}

/** Sammlungskarte, siehe ThumbnailCard für den gemeinsamen Aufbau mit PatternCard. */
export function CollectionCard({ collection, currentUserId, token, onChanged }: CollectionCardProps) {
  const { t } = useLanguage()

  const isOwner = Boolean(currentUserId && collection.owner?.id === currentUserId)
  const isSubscribed = Boolean(currentUserId && collection.subscribers.some((s) => s.id === currentUserId))

  return (
    <ThumbnailCard
      href={`/sammlung/${collection.documentId}`}
      thumbnail={<CollectionThumbnail patterns={collection.patterns} className="aspect-[3/1] w-full" />}
      title={collection.name}
      isPrivate={collection.visibility === 'private'}
      titleBadges={
        collection.isDefault && (
          <span className="text-xs font-normal text-muted-foreground">{t('profileDefaultBadge')}</span>
        )
      }
      ownerUsername={collection.owner?.username}
      cornerAction={
        !isOwner &&
        collection.visibility === 'public' &&
        token && (
          <CollectionSubscribeButton
            collectionId={collection.documentId}
            isSubscribed={isSubscribed}
            token={token}
            onChanged={() => onChanged?.()}
          />
        )
      }
      subtitle={
        collection.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
        )
      }
      footer={
        <p className="text-xs text-muted-foreground">
          {t('collectionPatternCount', { count: String(collection.patterns.length) })}
        </p>
      }
    />
  )
}
