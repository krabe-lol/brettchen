import { useLanguage } from '@/features/i18n/LanguageContext'

export function NutzungsbedingungenPage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('termsHeading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('termsPlaceholder')}</p>
    </div>
  )
}
