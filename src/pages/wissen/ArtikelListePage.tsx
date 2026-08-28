import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { fetchPublishedArticles, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { errorMessage } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { WovenBandPlaceholder } from '@/components/WovenBandPlaceholder'

export function ArtikelListePage() {
  const { t } = useLanguage()
  const [articles, setArticles] = useState<StrapiArticleRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    fetchPublishedArticles()
      .then((data) => {
        if (!cancelled) setArticles(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, t('profileLoadError')))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('articleListHeading')}</h1>

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : articles.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t('articleListPlaceholder')}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((article) => (
            <Card key={article.documentId} className="gap-0 overflow-hidden py-0">
              <Link to={`/wissen/${article.slug}`}>
                <WovenBandPlaceholder className="aspect-[16/10] w-full rounded-none" />
              </Link>
              <div className="flex flex-col gap-2 p-5">
                <Link to={`/wissen/${article.slug}`} className="font-serif text-lg hover:underline">
                  {article.title}
                </Link>
                {article.excerpt && <p className="text-sm text-muted-foreground">{article.excerpt}</p>}
                <Link to={`/wissen/${article.slug}`} className="mt-1 text-sm font-medium text-primary hover:underline">
                  {t('articleReadMore')} →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
