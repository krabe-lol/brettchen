import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CollectionBookmarkButton } from '@/features/library/CollectionBookmarkButton'
import { PatternThumbnail } from './PatternThumbnail'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { ThumbnailCard } from '@/components/ThumbnailCard'
import { Button } from '@/components/ui/button'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { StrapiPatternRecord } from '@/lib/strapi/patterns'

interface PatternCardProps {
  pattern: StrapiPatternRecord
  /**
   * If set together with `token`, shows the bookmark icon for collecting
   * (logged-in users) - the list is loaded once by the calling page, not per card.
   */
  collections?: StrapiCollectionRecord[]
  token?: string | null
  onCollectionsChanged?: () => void
  noStyleLabel: string
  /** Logged-in user; if it matches the pattern's creator, shows an edit icon on the thumbnail. */
  currentUsername?: string
  className?: string
}

/** Pattern card, see ThumbnailCard for the shared layout with CollectionCard. */
export function PatternCard({
  pattern,
  collections,
  token,
  onCollectionsChanged,
  noStyleLabel,
  currentUsername,
  className,
}: PatternCardProps) {
  const { t } = useLanguage()
  const isOwner = Boolean(currentUsername) && pattern.author?.username === currentUsername

  return (
    <ThumbnailCard
      href={`/pattern/${pattern.slug}`}
      className={className}
      thumbnail={
        <PatternThumbnail
          pattern={pattern}
          palette={pattern.defaultPalette}
          weftColorSlotId={pattern.weftColorSlot}
          className="aspect-[3/1] w-full"
        />
      }
      title={pattern.title}
      isPrivate={pattern.moderationStatus !== 'published'}
      ownerUsername={pattern.author?.username}
      thumbnailBadge={
        <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          {t('patternTabletCount', { count: String(pattern.numTablets) })}
        </span>
      }
      cornerAction={
        (isOwner || (collections && token && onCollectionsChanged)) && (
          <div className="flex gap-1">
            {isOwner && (
              <Button asChild size="icon" variant="secondary" className="size-8 shadow-sm backdrop-blur">
                <Link to={`/pattern/${pattern.slug}`} state={{ openInEdit: true }}>
                  <Pencil />
                </Link>
              </Button>
            )}
            {collections && token && onCollectionsChanged && (
              <CollectionBookmarkButton
                collections={collections}
                token={token}
                onChanged={onCollectionsChanged}
                patternId={pattern.documentId}
              />
            )}
          </div>
        )
      }
      subtitle={
        <p className="text-sm text-muted-foreground">
          {pattern.style && pattern.style.length > 0 ? pattern.style.join(', ') : noStyleLabel}
        </p>
      }
    />
  )
}
