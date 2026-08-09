import { useState } from 'react'
import { Rss } from 'lucide-react'
import { subscribeToCollection, unsubscribeFromCollection } from '@/lib/strapi/collections'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { Button } from '@/components/ui/button'

interface CollectionSubscribeButtonProps {
  collectionId: string
  isSubscribed: boolean
  token: string
  /** Wird nach erfolgreichem Abonnieren/Kündigen aufgerufen, damit die aufrufende Seite neu lädt. */
  onChanged: () => void
}

/**
 * Direkter Abonnieren/Kündigen-Toggle auf dem Sammlungsthumbnail – an
 * derselben Stelle wie CollectionBookmarkButton bei Mustern, aber ohne
 * Popover, da es hier nur einen einzigen Ein/Aus-Zustand gibt.
 */
export function CollectionSubscribeButton({
  collectionId,
  isSubscribed,
  token,
  onChanged,
}: CollectionSubscribeButtonProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleClick() {
    setIsSubmitting(true)
    try {
      if (isSubscribed) {
        await unsubscribeFromCollection(collectionId, token)
        toast(t('toastCollectionUnsubscribed'))
      } else {
        await subscribeToCollection(collectionId, token)
        toast(t('toastCollectionSubscribed'))
      }
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSubscribeError'), { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="size-8 shadow-sm backdrop-blur"
      onClick={handleClick}
      disabled={isSubmitting}
      aria-label={isSubscribed ? t('collectionUnsubscribe') : t('collectionSubscribe')}
      aria-pressed={isSubscribed}
    >
      <Rss className={isSubscribed ? 'fill-current' : undefined} />
    </Button>
  )
}
