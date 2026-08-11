import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { createPattern } from '@/lib/strapi/patterns'
import { PatternEditor } from '@/features/pattern-viewer/PatternEditor'
import { createEmptyPattern } from '@/features/pattern-viewer/emptyPattern'
import type { Pattern } from '@/features/pattern-viewer/types'

export function PatternNewPage() {
  const { user, token, isLoading } = useAuth()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const initialPattern = useMemo(
    () => createEmptyPattern(user?.username ?? '', t('patternDefaultTitle'), language),
    [user?.username, t, language],
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) return null
  if (!user || !token) return <Navigate to="/login" replace />

  async function handleSave(pattern: Pattern, status: 'draft' | 'published') {
    if (!user || !token) return
    setError(null)
    setIsSaving(true)
    try {
      await createPattern(pattern, status, token)
      toast(status === 'published' ? t('toastPatternPublished') : t('toastPatternSaved'))
      navigate('/profil')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('patternSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="py-12">
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <PatternEditor
        heading={t('patternNewHeading')}
        initialPattern={initialPattern}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}
