import { useCallback, useEffect, useState } from 'react'
import { Trash } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import {
  addPatternToCollection,
  deleteCollection,
  fetchCollectionById,
  fetchMyCollections,
  subscribeToCollection,
  unsubscribeFromCollection,
  updateCollection,
  type CollectionVisibility,
  type StrapiCollectionRecord,
} from '@/lib/strapi/collections'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const DESCRIPTION_MAX_LENGTH = 500

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user, token, isLoading: isAuthLoading } = useAuth()

  const [collection, setCollection] = useState<StrapiCollectionRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<CollectionVisibility>('private')

  const [publishedPatterns, setPublishedPatterns] = useState<StrapiPatternRecord[]>([])
  const [myCollections, setMyCollections] = useState<StrapiCollectionRecord[]>([])

  useEffect(() => {
    if (!id || isAuthLoading) return
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    fetchCollectionById(id, token ?? undefined)
      .then((data) => {
        if (cancelled) return
        setCollection(data)
        setName(data.name)
        setDescription(data.description ?? '')
        setVisibility(data.visibility)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : t('collectionDetailNotFound'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, token, isAuthLoading, t])

  /** Für das Bookmark-Icon auf jeder Musterkarte (siehe CollectionBookmarkButton) – die eigenen Sammlungen der eingeloggten Person. */
  const loadMyCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setMyCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    loadMyCollections()
  }, [loadMyCollections])

  /** Lädt die gerade angezeigte Sammlung neu, z. B. nachdem das Bookmark-Icon ein Muster entfernt/hinzugefügt hat. */
  function reloadCollection() {
    if (!id) return
    fetchCollectionById(id, token ?? undefined)
      .then(setCollection)
      .catch(() => {})
  }

  /**
   * Für die Vorschläge unten (siehe `suggestions`): nur für die Besitzer-
   * Person, einmal geladen sobald sie feststeht (nicht bei jeder Änderung
   * der Sammlung selbst neu, das würde bei jedem Hinzufügen/Entfernen einen
   * unnötigen weiteren Request auslösen).
   */
  useEffect(() => {
    if (!user || !collection || collection.owner?.id !== user.id) return
    let cancelled = false
    fetchPublishedPatterns()
      .then((patterns) => {
        if (!cancelled) setPublishedPatterns(patterns)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, collection?.owner?.id])

  if (isLoading) {
    return (
      <div className="py-12">
        <p className="text-muted-foreground">{t('profileLoading')}</p>
      </div>
    )
  }
  if (loadError || !collection) {
    return (
      <div className="py-12">
        <p className="text-destructive">{loadError ?? t('collectionDetailNotFound')}</p>
      </div>
    )
  }

  const isOwner = Boolean(user && collection.owner?.id === user.id)
  const isSubscribed = Boolean(user && collection.subscribers.some((s) => s.id === user.id))

  /**
   * Veröffentlichte Muster, die noch nicht in der Sammlung sind, bevorzugt
   * mit mindestens einem Stil-Tag, das auch ein bereits enthaltenes Muster
   * hat – bewusst simple Heuristik statt echter Ähnlichkeitssuche. Gibt es
   * dafür nichts (leere Sammlung oder Muster ganz ohne Stil-Tags), zeigen
   * wir stattdessen einfach die neuesten veröffentlichten Muster, statt gar
   * nichts vorzuschlagen.
   */
  const existingPatternIds = new Set(collection.patterns.map((p) => p.documentId))
  const existingStyles = new Set(collection.patterns.flatMap((p) => p.style ?? []))
  const candidatePatterns = publishedPatterns.filter((p) => !existingPatternIds.has(p.documentId))
  const matchingPatterns = candidatePatterns.filter((p) => (p.style ?? []).some((tag) => existingStyles.has(tag)))
  const suggestions = isOwner ? (matchingPatterns.length > 0 ? matchingPatterns : candidatePatterns).slice(0, 8) : []

  async function handleSave() {
    if (!token || !collection) return
    setIsSaving(true)
    try {
      const saved = await updateCollection(collection.documentId, { name, description, visibility }, token)
      setCollection(saved)
      setIsEditing(false)
      toast(t('toastCollectionSaved'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!token || !collection) return
    if (!window.confirm(t('collectionDeleteConfirm'))) return
    try {
      await deleteCollection(collection.documentId, token)
      toast(t('toastCollectionDeleted'))
      navigate('/profil')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
    }
  }

  async function handleSubscribeToggle() {
    if (!token || !collection) return
    setIsSubscribing(true)
    try {
      const updated = isSubscribed
        ? await unsubscribeFromCollection(collection.documentId, token)
        : await subscribeToCollection(collection.documentId, token)
      setCollection(updated)
      toast(isSubscribed ? t('toastCollectionUnsubscribed') : t('toastCollectionSubscribed'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSubscribeError'), { variant: 'error' })
    } finally {
      setIsSubscribing(false)
    }
  }

  /** Nach Hinzufügen/Entfernen über das Bookmark-Icon einer Musterkarte (siehe CollectionBookmarkButton). */
  function handleCollectionsChanged() {
    reloadCollection()
    loadMyCollections()
  }

  async function handleAddSuggestion(patternId: string) {
    if (!token || !collection) return
    try {
      const updated = await addPatternToCollection(collection.documentId, patternId, token)
      setCollection(updated)
      loadMyCollections()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('collectionSaveError'), { variant: 'error' })
    }
  }

  function handleStartEditing() {
    if (!collection) return
    setName(collection.name)
    setDescription(collection.description ?? '')
    setVisibility(collection.visibility)
    setIsEditing(true)
  }

  return (
    <div className="py-12">
      <Card className="gap-3">
        {isOwner && isEditing ? (
          <CardContent className="flex flex-col gap-3">
            <div className="flex max-w-md flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="collection-name">{t('infoTitle')}</Label>
                <Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="collection-description">{t('collectionDescriptionPlaceholder')}</Label>
                <Textarea
                  id="collection-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
              </div>
              <ToggleGroup
                type="single"
                spacing="none"
                value={visibility}
                onValueChange={(value) => value && setVisibility(value as CollectionVisibility)}
              >
                <ToggleGroupItem value="private">{t('collectionVisibilityPrivate')}</ToggleGroupItem>
                <ToggleGroupItem value="public">{t('collectionVisibilityPublic')}</ToggleGroupItem>
              </ToggleGroup>
              <div className="flex gap-2">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t('editorSaving') : t('editorSaveDraft')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  {t('collectionEditCancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="text-3xl font-semibold tracking-tight">{collection.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isOwner && collection.visibility === 'public' && token && (
                    <Button
                      type="button"
                      variant={isSubscribed ? 'outline' : 'default'}
                      onClick={handleSubscribeToggle}
                      disabled={isSubscribing}
                    >
                      {isSubscribed ? t('collectionUnsubscribe') : t('collectionSubscribe')}
                    </Button>
                  )}
                  {isOwner && (
                    <Button type="button" onClick={handleStartEditing}>
                      {t('patternEditButton')}
                    </Button>
                  )}
                  {isOwner && !collection.isDefault && (
                    <Button type="button" size="icon" variant="destructive" onClick={handleDelete}>
                      <Trash />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {collection.owner?.username && (
                <p className="text-sm text-muted-foreground">
                  {t('infoCreator')}:{' '}
                  <Link to={`/profil/${collection.owner.username}`} className="text-primary underline">
                    {collection.owner.username}
                  </Link>
                </p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{t('collectionPatternCount', { count: String(collection.patterns.length) })}</span>
                <span>{t('collectionSubscriberCount', { count: String(collection.subscribers.length) })}</span>
              </div>
              {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
            </CardContent>
          </>
        )}
      </Card>

      <h2 className="mt-10 text-xl font-semibold">{t('profileMyPatterns')}</h2>
      {collection.patterns.length === 0 ? (
        <p className="mt-2 text-muted-foreground">{t('profileEmptyCollection')}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.patterns.map((pattern) => (
            <PatternCard
              key={pattern.documentId}
              pattern={pattern}
              noStyleLabel={t('profileNoStyle')}
              currentUsername={user?.username}
              collections={user ? myCollections : undefined}
              token={token}
              onCollectionsChanged={handleCollectionsChanged}
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <h2 className="mt-80 text-xl font-semibold">{t('collectionSuggestionsHeading')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {suggestions.map((pattern) => (
              <div key={pattern.documentId} className="flex flex-col gap-2">
                <PatternCard pattern={pattern} noStyleLabel={t('profileNoStyle')} currentUsername={user?.username} className="opacity-80" />
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddSuggestion(pattern.documentId)}>
                  {t('collectionAddPattern')}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
