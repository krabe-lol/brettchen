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
  removeRemixLink,
  toPattern,
  updatePattern,
  type StrapiPatternRecord,
} from '@/lib/strapi/patterns'
import { fetchMyCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { Pattern } from '@/features/pattern-viewer/types'
import { errorMessage } from '@/lib/utils'

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
  const [isRemovingRemixLink, setIsRemovingRemixLink] = useState(false)
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
    // Wait until login status is settled - otherwise an own draft would briefly flash as 404 before the token is available.
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
        /** After remixing (see handleRemix), the creator lands directly in edit mode instead of view mode. */
        if ((location.state as { openInEdit?: boolean } | null)?.openInEdit && data.author?.username === user?.username) {
          setIsEditing(true)
          navigate(location.pathname, { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, t('patternDetailNotFound')))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // location/user/navigate/t deliberately not in the deps: `openInEdit` should only be consumed once
    // when this slug loads (then cleared right away via replace navigation), not reload the whole
    // pattern again on every later change of location/user. `token` deliberately not in the deps
    // either - AuthContext refreshes it every few minutes in the background, and refetching here would
    // reset isEditing to false, silently kicking anyone out of the editor mid-edit. The token is still
    // current when this effect does run (isAuthLoading only turns false once the initial refresh settles).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthLoading])

  const pattern = useMemo(() => (record ? toPattern(record) : null), [record])
  const isOwner = Boolean(user && record?.author?.username === user.username)

  async function handleSave(updated: Pattern, status: 'draft' | 'published') {
    if (!record || !token) return
    setSaveError(null)
    setIsSaving(true)
    try {
      const saved = await updatePattern(record.documentId, updated, status, token)
      setRecord(saved)
      toast(status === 'published' ? t('toastPatternPublished') : t('toastPatternSaved'))
    } catch (err) {
      setSaveError(errorMessage(err, t('patternSaveError')))
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
      toast(errorMessage(err, t('patternDeleteError')), { variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRemoveRemixLink() {
    if (!record || !token) return
    if (!window.confirm(t('infoRemixRemoveLinkConfirm'))) return
    setIsRemovingRemixLink(true)
    try {
      const updated = await removeRemixLink(record.documentId, token)
      setRecord(updated)
      toast(t('toastRemixLinkRemoved'))
    } catch (err) {
      toast(errorMessage(err, t('patternSaveError')), { variant: 'error' })
    } finally {
      setIsRemovingRemixLink(false)
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
      toast(errorMessage(err, t('patternRemixError')), { variant: 'error' })
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
            onClose={() => setIsEditing(false)}
            isSaving={isSaving}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            moderationStatus={record?.moderationStatus === 'published' ? 'published' : 'draft'}
            onRemoveRemixLink={handleRemoveRemixLink}
            isRemovingRemixLink={isRemovingRemixLink}
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
