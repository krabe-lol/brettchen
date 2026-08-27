import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CollectionBookmarkButton } from '@/features/library/CollectionBookmarkButton'
import { PatternThumbnail } from './PatternThumbnail'
import { countUsedColors } from './render/threadCounts'
import { computeDifficulty } from './render/difficulty'
import { difficultyLabel } from './render/difficultyLabel'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { ThumbnailCard } from '@/components/ThumbnailCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  /**
   * Bulk-selection checkbox top-left (see usePatternSelection) - omitted
   * entirely unless the calling page opted into it. While any card is
   * selected, every card's own corner actions (edit/bookmark) hide, not
   * just the selected ones - keeps the grid focused on the bulk toolbar.
   */
  selected?: boolean
  /** `shiftKey` is true for a shift-click - see usePatternSelection.toggle for the range-select behavior that triggers. */
  onToggleSelected?: (shiftKey: boolean) => void
  selectionActive?: boolean
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
  selected,
  onToggleSelected,
  selectionActive,
  className,
}: PatternCardProps) {
  const { t } = useLanguage()
  const isOwner = Boolean(currentUsername) && pattern.author?.username === currentUsername
  const colorCount = countUsedColors(pattern)
  const difficulty = computeDifficulty(pattern)

  return (
    <ThumbnailCard
      href={`/pattern/${pattern.slug}`}
      className={className}
      selected={selected}
      topLeftAction={
        onToggleSelected && (
          // -m-2/p-2 enlarge the click target well beyond the checkbox's own
          // size-4 without growing it visually - the negative margin cancels
          // the padding out again for layout/positioning purposes. The click
          // handler lives here (not on the Checkbox's onCheckedChange) so it
          // catches clicks anywhere in the padded area AND gets the native
          // event, which onCheckedChange doesn't provide - needed for
          // shiftKey (see usePatternSelection.toggle's range-select).
          <div
            className="-m-2 flex cursor-pointer items-center justify-center p-2"
            onClick={(e) => onToggleSelected(e.shiftKey)}
          >
            <Checkbox
              checked={selected}
              className="bg-background/80 shadow-sm backdrop-blur data-[state=checked]:bg-primary/80"
              aria-label={t('patternSelectLabel', { title: pattern.title })}
            />
          </div>
        )
      }
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
        <div className="flex gap-1">
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
            {t('patternTabletCount', { count: String(pattern.numTablets) })}
          </span>
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
            {t('patternColorCount', { count: String(colorCount) })}
          </span>
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
            {difficultyLabel(t, difficulty)}
          </span>
        </div>
      }
      cornerAction={
        !selectionActive &&
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
