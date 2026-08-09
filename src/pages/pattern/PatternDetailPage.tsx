import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { PatternEditor } from '@/features/pattern-viewer/PatternEditor'
import { PatternViewer } from '@/features/pattern-viewer/PatternViewer'
import {
  deletePattern,
  fetchPatternBySlug,
  remixPattern,
  toPattern,
  updatePattern,
  type StrapiPatternRecord,
} from '@/lib/strapi/patterns'
import { fetchMyCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { Pattern } from '@/features/pattern-viewer/types'

export function PatternDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token, isLoading: isAuthLoading } = useAuth()
  const [record, setRecord] = useState<StrapiPatternRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isRemixing, setIsRemixing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])

  const loadCollections = useCallback(() => {
    if (!token) return
    fetchMyCollections(token)
      .then(setCollections)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  useEffect(() => {
    // Warten, bis der Login-Status feststeht – sonst würde ein eigener
    // Entwurf kurz als 404 aufblitzen, bevor der Token verfügbar ist.
    if (!slug || isAuthLoading) return
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setRecord(null)
    setIsEditing(false)
    fetchPatternBySlug(slug, token ?? undefined)
      .then((data) => {
        if (cancelled) return
        setRecord(data)
        /** Nach dem Remixen (siehe handleRemix) landet die Ersteller-Person direkt im Bearbeiten-Modus statt in der Ansicht. */
        if ((location.state as { openInEdit?: boolean } | null)?.openInEdit && data.author?.username === user?.username) {
          setIsEditing(true)
          navigate(location.pathname, { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : t('patternDetailNotFound'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // location/user/navigate bewusst nicht als Dependency: `openInEdit` soll nur einmalig beim
    // Laden dieses Slugs konsumiert werden (danach per replace-Navigation sofort wieder gelöscht),
    // nicht bei jeder späteren Änderung von location/user erneut das ganze Muster neu laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token, isAuthLoading, t])

  const pattern = useMemo(() => (record ? toPattern(record) : null), [record])
  const isOwner = Boolean(user && record?.author?.username === user.username)

  async function handleSave(updated: Pattern, status: 'draft' | 'published', close = false) {
    if (!record || !token) return
    setSaveError(null)
    setIsSaving(true)
    try {
      const saved = await updatePattern(record.documentId, updated, status, token)
      setRecord(saved)
      if (close) setIsEditing(false)
      toast(status === 'published' ? t('toastPatternPublished') : t('toastPatternSaved'))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('patternSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!record || !token) return
    setIsDeleting(true)
    try {
      await deletePattern(record.documentId, token)
      toast(t('toastPatternDeleted'))
      navigate('/profil')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('patternDeleteError'), { variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRemix() {
    if (!record || !token) return
    setIsRemixing(true)
    try {
      const remixed = await remixPattern(record.documentId, token)
      toast(t('toastPatternRemixed'))
      navigate(`/pattern/${remixed.slug}`, { state: { openInEdit: true } })
    } catch (err) {
      toast(err instanceof Error ? err.message : t('patternRemixError'), { variant: 'error' })
    } finally {
      setIsRemixing(false)
    }
  }

  return (
    <div className="py-12">
      {isLoading ? (
        <p className="text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError || !pattern ? (
        <p className="text-destructive">{loadError ?? t('patternDetailNotFound')}</p>
      ) : isOwner && isEditing ? (
        <>
          {saveError && <p className="mb-4 text-sm text-destructive">{saveError}</p>}
          <PatternEditor
            heading={pattern.title}
            initialPattern={pattern}
            onSave={handleSave}
            onSaveAndClose={(updated, status) => handleSave(updated, status, true)}
            isSaving={isSaving}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            moderationStatus={record?.moderationStatus === 'published' ? 'published' : 'draft'}
          />
        </>
      ) : (
        <PatternViewer
          heading={pattern.title}
          pattern={pattern}
          onRemix={user ? handleRemix : undefined}
          isRemixing={isRemixing}
          onEdit={isOwner ? () => setIsEditing(true) : undefined}
          onDelete={isOwner ? handleDelete : undefined}
          isDeleting={isDeleting}
          patternId={record?.documentId}
          collections={collections}
          token={token}
          onCollectionsChanged={loadCollections}
        />
      )}
    </div>
  )
}
