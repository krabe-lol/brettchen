import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="mt-12 border-t py-6 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{t('footerDisclaimer')}</p>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-foreground hover:underline">
            {t('footerTerms')}
          </Link>
          <Link to="/imprint" className="hover:text-foreground hover:underline">
            {t('footerImprint')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
