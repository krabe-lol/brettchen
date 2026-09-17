import { cn } from '@/lib/utils'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { articleCategoryBadgeClass, articleCategoryLabel } from './articleCategory'
import type { ArticleCategory } from '@/lib/strapi/articles'

export function ArticleCategoryBadge({ category, className }: { category: ArticleCategory; className?: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={cn('w-fit rounded-full px-2.5 py-1 text-xs font-medium', articleCategoryBadgeClass(category), className)}
    >
      {articleCategoryLabel(t, category)}
    </span>
  )
}
