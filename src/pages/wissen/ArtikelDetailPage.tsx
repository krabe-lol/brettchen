import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { fetchArticleBySlug, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { errorMessage } from '@/lib/utils'
import { ArticleCoverImage } from './ArticleCoverImage'
import { ArticleCategoryBadge } from './ArticleCategoryBadge'
import { ArticleByline } from './ArticleByline'

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
          <ArticleCoverImage article={article} className="aspect-[16/9] w-full rounded-2xl" />
          <ArticleCategoryBadge category={article.category} className="mt-6" />
          <h1 className="mt-3 font-serif text-3xl tracking-tight">{article.title}</h1>
          <ArticleByline article={article} className="mt-2 text-xs text-muted-foreground" />
          {article.content && (
            <div className="prose mt-6 max-w-none [&_h2]:font-serif [&_h3]:font-serif">
              <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>
          )}
        </article>
      )}

      <Link to="/knowledge" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
        ← {t('articleBackToList')}
      </Link>
    </div>
  )
}
