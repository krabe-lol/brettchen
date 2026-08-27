import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bookmark, X } from 'lucide-react'
import {
  addPatternToCollection,
  createCollection,
  removePatternFromCollection,
  type StrapiCollectionRecord,
} from '@/lib/strapi/collections'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, errorMessage } from '@/lib/utils'

interface CollectionBookmarkButtonProps {
  /** The logged-in user's own collections, loaded once by the calling page (not per card). */
  collections: StrapiCollectionRecord[]
  patternId: string
  token: string
  /** Called after adding to/creating a collection, so the calling page reloads them. */
  onChanged: () => void
  className?: string
}

/**
 * Single entry point for collections on a pattern thumbnail: clicking the
 * bookmark icon opens a small panel to pick an existing collection or
 * create a new one (always private - full description/visibility can be
 * set on the profile page).
 */
export function CollectionBookmarkButton({
  collections,
  patternId,
  token,
  onChanged,
  className,
}: CollectionBookmarkButtonProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isBookmarked = collections.some((collection) => collection.patterns.some((p) => p.documentId === patternId))

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  async function handleAdd(collectionId: string) {
    setIsSubmitting(true)
    try {
      await addPatternToCollection(collectionId, patternId, token)
      onChanged()
      toast(t('toastAddedToCollection'))
    } catch (err) {
      toast(errorMessage(err, t('collectionSaveError')), { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove(collectionId: string) {
    setIsSubmitting(true)
    try {
      await removePatternFromCollection(collectionId, patternId, token)
      onChanged()
      toast(t('toastRemovedFromCollection'))
    } catch (err) {
      toast(errorMessage(err, t('collectionSaveError')), { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newCollectionName.trim()) return
    setIsSubmitting(true)
    try {
      const collection = await createCollection(newCollectionName.trim(), '', 'private', token)
      await addPatternToCollection(collection.documentId, patternId, token)
      setNewCollectionName('')
      onChanged()
      toast(t('toastCollectionCreated'))
    } catch (err) {
      toast(errorMessage(err, t('collectionSaveError')), { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="size-8 shadow-sm backdrop-blur"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('collectionBookmarkLabel')}
        aria-pressed={isBookmarked}
      >
        <Bookmark className={isBookmarked ? 'fill-current' : undefined} />
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-60 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          {collections.length === 0 ? (
            <p className="px-1 py-1 text-xs text-muted-foreground">{t('profileEmptyCollection')}</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {collections.map((collection) => {
                const isInCollection = collection.patterns.some((p) => p.documentId === patternId)
                return (
                  <div key={collection.documentId} className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={isInCollection ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start"
                      disabled={isSubmitting}
                      onClick={() => handleAdd(collection.documentId)}
                    >
                      {collection.name}
                    </Button>
                    {isInCollection && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={isSubmitting}
                        onClick={() => handleRemove(collection.documentId)}
                        aria-label={t('collectionRemoveFromLabel')}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <form onSubmit={handleCreate} className="mt-2 flex gap-1 border-t pt-2">
            <Input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={t('profileNewCollectionPlaceholder')}
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {t('profileCreateCollection')}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
