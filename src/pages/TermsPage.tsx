import { useLanguage } from '@/features/i18n/LanguageContext'

export function TermsPage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('termsHeading')}</h1>
      <div className="mt-6 flex max-w-2xl flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('termsRightsHeading')}</h2>
        <p className="text-muted-foreground">{t('termsRightsIntro')}</p>
        <p className="text-muted-foreground">{t('termsUploadNote')}</p>
        <p className="text-muted-foreground">{t('termsRightsViolation')}</p>
      </div>
    </div>
  )
}
