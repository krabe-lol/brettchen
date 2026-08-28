import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { fetchArticleBySlug, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { errorMessage } from '@/lib/utils'
import { WovenBandPlaceholder } from '@/components/WovenBandPlaceholder'

export function ArtikelDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useLanguage()
  const [article, setArticle] = useState<StrapiArticleRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setArticle(null)
    fetchArticleBySlug(slug)
      .then((data) => {
        if (!cancelled) setArticle(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, t('articleDetailNotFound')))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, t])

  return (
    <div className="py-12">
      {isLoading ? (
        <p className="text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError || !article ? (
        <p className="text-destructive">{loadError ?? t('articleDetailNotFound')}</p>
      ) : (
        <article className="max-w-2xl">
          <WovenBandPlaceholder className="aspect-[16/9] w-full rounded-2xl" />
          <h1 className="mt-6 font-serif text-3xl tracking-tight">{article.title}</h1>
          {article.content && <p className="mt-6 whitespace-pre-wrap leading-relaxed">{article.content}</p>}
        </article>
      )}

      <Link to="/wissen" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
        ← {t('articleBackToList')}
      </Link>
    </div>
  )
}
