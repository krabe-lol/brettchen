import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FolderPlus } from 'lucide-react'
import { addPatternToCollection, createCollection, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BulkAddToCollectionButtonProps {
  collections: StrapiCollectionRecord[]
  patternIds: string[]
  token: string
  onChanged: () => void
}

/**
 * Bulk counterpart to CollectionBookmarkButton: adds every selected
 * pattern to one chosen (or newly created) collection at once, instead of
 * toggling membership for a single pattern - no per-collection "already
 * in there" state, since that's ambiguous across a multi-selection.
 */
export function BulkAddToCollectionButton({ collections, patternIds, token, onChanged }: BulkAddToCollectionButtonProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  async function addAllTo(collectionId: string) {
    setIsSubmitting(true)
    try {
      await Promise.all(patternIds.map((patternId) => addPatternToCollection(collectionId, patternId, token)))
      onChanged()
      setOpen(false)
      toast(t('toastAddedToCollection'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
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
      await Promise.all(patternIds.map((patternId) => addPatternToCollection(collection.documentId, patternId, token)))
      setNewCollectionName('')
      onChanged()
      setOpen(false)
      toast(t('toastCollectionCreated'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="outline" onClick={() => setOpen((o) => !o)}>
        <FolderPlus />
        {t('patternBulkAddToCollection')}
      </Button>

      {open && (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-10 mt-1 w-60 rounded-md border p-2 shadow-md">
          {collections.length === 0 ? (
            <p className="px-1 py-1 text-xs text-muted-foreground">{t('profileEmptyCollection')}</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {collections.map((collection) => (
                <Button
                  key={collection.documentId}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="justify-start"
                  disabled={isSubmitting}
                  onClick={() => addAllTo(collection.documentId)}
                >
                  {collection.name}
                </Button>
              ))}
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
