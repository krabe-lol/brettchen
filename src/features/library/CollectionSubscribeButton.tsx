import { useState } from 'react'
import { Rss } from 'lucide-react'
import { subscribeToCollection, unsubscribeFromCollection } from '@/lib/strapi/collections'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/utils'

interface CollectionSubscribeButtonProps {
  collectionId: string
  isSubscribed: boolean
  token: string
  /** Called after successfully subscribing/unsubscribing, so the calling page can reload. */
  onChanged: () => void
}

/**
 * Direct subscribe/unsubscribe toggle on the collection thumbnail - same
 * spot as CollectionBookmarkButton on patterns, but without a popover since
 * there's only a single on/off state here.
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
      toast(errorMessage(err, t('collectionSubscribeError')), { variant: 'error' })
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
