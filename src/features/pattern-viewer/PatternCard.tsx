import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CollectionBookmarkButton } from '@/features/library/CollectionBookmarkButton'
import { PatternThumbnail } from './PatternThumbnail'
import { ThumbnailCard } from '@/components/ThumbnailCard'
import { Button } from '@/components/ui/button'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { StrapiPatternRecord } from '@/lib/strapi/patterns'

interface PatternCardProps {
  pattern: StrapiPatternRecord
  /**
   * Wenn zusammen mit `token` gesetzt, erscheint das Lesezeichen-Icon zum
   * Sammeln (eingeloggte Nutzer:innen) – die Liste wird einmal von der
   * aufrufenden Seite geladen, nicht pro Karte.
   */
  collections?: StrapiCollectionRecord[]
  token?: string | null
  onCollectionsChanged?: () => void
  noStyleLabel: string
  /** Eingeloggte Person; stimmt sie mit dem Ersteller des Musters überein, erscheint ein Bearbeiten-Icon auf dem Thumbnail. */
  currentUsername?: string
  className?: string
}

/** Musterkarte, siehe ThumbnailCard für den gemeinsamen Aufbau mit CollectionCard. */
export function PatternCard({
  pattern,
  collections,
  token,
  onCollectionsChanged,
  noStyleLabel,
  currentUsername,
  className,
}: PatternCardProps) {
  const isOwner = Boolean(currentUsername) && pattern.author?.username === currentUsername

  return (
    <ThumbnailCard
      href={`/pattern/${pattern.slug}`}
      className={className}
      thumbnail={
        <PatternThumbnail pattern={pattern} palette={pattern.defaultPalette} className="aspect-[3/1] w-full" />
      }
      title={pattern.title}
      isPrivate={pattern.moderationStatus !== 'published'}
      ownerUsername={pattern.author?.username}
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
