import { useLanguage } from '@/features/i18n/LanguageContext'
import { estimateReadingMinutes } from './articleCategory'
import type { StrapiArticleRecord } from '@/lib/strapi/articles'

function formatArticleDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(iso))
}

/** "Author · date · reading time" - reading time is estimated from word count (~200 wpm), not manually maintained. */
export function ArticleByline({ article, className }: { article: StrapiArticleRecord; className?: string }) {
  const { t, language } = useLanguage()
  const parts = [
    article.authorName,
    formatArticleDate(article.createdAt, language),
    t('articleReadingMinutes', { count: String(estimateReadingMinutes(article.content)) }),
  ].filter(Boolean)
  return <p className={className ?? 'text-xs text-muted-foreground'}>{parts.join(' · ')}</p>
}
