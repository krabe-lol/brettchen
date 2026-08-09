import { useParams } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'

/**
 * TODO: Artikel via strapiClient.findOne('articles', slug) laden, sobald das
 * Strapi-Backend steht.
 */
export function ArtikelDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('articleDetailHeading', { slug: slug ?? '' })}</h1>
      <p className="mt-2 text-muted-foreground">{t('articleDetailPlaceholder')}</p>
    </div>
  )
}
