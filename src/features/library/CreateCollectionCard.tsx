import { useState, type FormEvent } from 'react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { createCollection, type CollectionVisibility } from '@/lib/strapi/collections'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface CreateCollectionCardProps {
  token: string
  /** Called after successfully creating a collection (e.g. to reload the list). */
  onCreated: () => void
}

/** Tile for creating a new collection, in the same spot as the existing collection cards (see CollectionCard). */
export function CreateCollectionCard({ token, onCreated }: CreateCollectionCardProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState<CollectionVisibility>('private')
  const [isCreating, setIsCreating] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsCreating(true)
    try {
      await createCollection(name.trim(), '', visibility, token)
      setName('')
      setVisibility('private')
      onCreated()
      toast(t('toastCollectionCreated'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <h3 className="font-medium">{t('collectionCreateHeading')}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profileNewCollectionPlaceholder')} />
          <ToggleGroup
            type="single"
            spacing="none"
            stretch="stretched"
            value={visibility}
            onValueChange={(value) => value && setVisibility(value as CollectionVisibility)}
          >
            <ToggleGroupItem value="private">{t('collectionVisibilityPrivate')}</ToggleGroupItem>
            <ToggleGroupItem value="public">{t('collectionVisibilityPublic')}</ToggleGroupItem>
          </ToggleGroup>
          <Button type="submit" disabled={isCreating || !name.trim()}>
            {t('profileCreateCollection')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
