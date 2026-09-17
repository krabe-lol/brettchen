import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchPublishedArticles, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { ArticleCoverImage } from './wissen/ArticleCoverImage'
import { ArticleCategoryBadge } from './wissen/ArticleCategoryBadge'
import { ArticleByline } from './wissen/ArticleByline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** How many of the most recently published patterns/articles show in the homepage teasers. */
const FRESH_PATTERNS_COUNT = 3
const RECENT_ARTICLES_COUNT = 3

/**
 * Landing page: hero, three value props, and teaser rows of the most
 * recently published patterns and articles (real data - not the full
 * lists, those are /pattern and /knowledge).
 */
export function HomePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [freshPatterns, setFreshPatterns] = useState<StrapiPatternRecord[]>([])
  const [recentArticles, setRecentArticles] = useState<StrapiArticleRecord[]>([])

  useEffect(() => {
    fetchPublishedPatterns()
      .then((patterns) => setFreshPatterns(patterns.slice(0, FRESH_PATTERNS_COUNT)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchPublishedArticles()
      .then((articles) => setRecentArticles(articles.slice(0, RECENT_ARTICLES_COUNT)))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-20 py-12">
      <section className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex max-w-xl flex-col gap-5">
          <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance">{t('homeHeadline')}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{t('homeSubtitle')}</p>
          <nav className="mt-2 flex gap-3">
            <Button asChild size="lg">
              <Link to="/pattern">{t('homeToPatterns')}</Link>
            </Button>
          </nav>
        </div>
        <img
          src="/hero-loom.jpg"
          alt=""
          className="h-80 w-full max-w-md shrink-0 rounded-2xl object-cover"
        />
      </section>

      {freshPatterns.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">{t('homeFreshPatterns')}</h2>
            <Link to="/pattern" className="text-primary text-sm font-medium hover:underline">
              {t('homeToPatterns')} →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {freshPatterns.map((pattern) => (
              <PatternCard
                key={pattern.documentId}
                pattern={pattern}
                noStyleLabel={t('profileNoStyle')}
                currentUsername={user?.username}
              />
            ))}
          </div>
        </section>
      )}

      {recentArticles.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">{t('homeFromTheBlog')}</h2>
            <Link to="/knowledge" className="text-primary text-sm font-medium hover:underline">
              {t('homeToKnowledge')} →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map((article) => (
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
        </section>
      )}
    </div>
  )
}
