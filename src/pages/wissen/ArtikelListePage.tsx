import { useLanguage } from '@/features/i18n/LanguageContext'

// TODO: load articles via strapiClient.findMany('articles') once that content type exists
export function ArtikelListePage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('articleListHeading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('articleListPlaceholder')}</p>
    </div>
  )
}
