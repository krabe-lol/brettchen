import { useLanguage } from '@/features/i18n/LanguageContext'

export function ImprintPage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('imprintHeading')}</h1>
      <div className="mt-6 flex max-w-2xl flex-col gap-2 text-muted-foreground">
        <p>{t('imprintOperatorNote')}</p>
        <p>{t('imprintContact')}</p>
      </div>
    </div>
  )
}
