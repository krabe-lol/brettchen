import { useLanguage } from '@/features/i18n/LanguageContext'

export function ImpressumPage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('imprintHeading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('imprintPlaceholder')}</p>
    </div>
  )
}
