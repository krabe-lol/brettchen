import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { fetchPublishedArticles, type ArticleCategory, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { errorMessage } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArticleCoverImage } from './ArticleCoverImage'
import { ArticleCategoryBadge } from './ArticleCategoryBadge'
import { ArticleByline } from './ArticleByline'
import { ARTICLE_CATEGORIES, articleCategoryLabel } from './articleCategory'

export function ArtikelListePage() {
  const { t } = useLanguage()
  const [articles, setArticles] = useState<StrapiArticleRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<ArticleCategory | null>(null)

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

  const filteredArticles = activeCategory ? articles.filter((article) => article.category === activeCategory) : articles

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('articleListHeading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('articleListSubtitle')}</p>

      {!isLoading && !loadError && articles.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeCategory === null ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setActiveCategory(null)}
          >
            {t('articleCategoryAll')}
          </Button>
          {ARTICLE_CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={activeCategory === category ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setActiveCategory(category)}
            >
              {articleCategoryLabel(t, category)}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
      ) : loadError ? (
        <p className="mt-4 text-destructive">{loadError}</p>
      ) : filteredArticles.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t('articleListPlaceholder')}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArticles.map((article) => (
            <Card key={article.documentId} className="gap-0 overflow-hidden py-0">
              <Link to={`/knowledge/${article.slug}`}>
                <ArticleCoverImage article={article} className="aspect-[16/10] w-full rounded-none" />
              </Link>
              <div className="flex flex-col items-start gap-2 p-5">
                <ArticleCategoryBadge category={article.category} />
                <Link to={`/knowledge/${article.slug}`} className="font-serif text-lg hover:underline">
                  {article.title}
                </Link>
                {article.excerpt && <p className="text-sm text-muted-foreground">{article.excerpt}</p>}
                <ArticleByline article={article} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
