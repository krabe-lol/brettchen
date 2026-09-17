import type { ArticleCategory } from '@/lib/strapi/articles'
import type { TranslationKey } from '@/features/i18n/translations'

/** Filter pill order on the list page. */
export const ARTICLE_CATEGORIES: ArticleCategory[] = ['guide', 'history', 'technique', 'material']

const LABEL_KEY_BY_CATEGORY: Record<ArticleCategory, TranslationKey> = {
  guide: 'articleCategoryGuide',
  history: 'articleCategoryHistory',
  technique: 'articleCategoryTechnique',
  material: 'articleCategoryMaterial',
}

export function articleCategoryLabel(t: (key: TranslationKey) => string, category: ArticleCategory): string {
  return t(LABEL_KEY_BY_CATEGORY[category])
}

/** Pastel badge color per category, light and dark - purely a visual grouping, not meaningful beyond that. */
const BADGE_CLASS_BY_CATEGORY: Record<ArticleCategory, string> = {
  guide: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  history: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  technique: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  material: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
}

export function articleCategoryBadgeClass(category: ArticleCategory): string {
  return BADGE_CLASS_BY_CATEGORY[category]
}

/** ~200 words/minute, rounded up to a whole minute (never 0, even for a one-line article). */
export function estimateReadingMinutes(content: string | null): number {
  if (!content) return 1
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}
