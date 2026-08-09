import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'

export function HomePage() {
  const { t } = useLanguage()

  return (
    <div className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Brettchenweben</h1>
      <p className="mt-2 text-muted-foreground">{t('homeSubtitle')}</p>
      <nav className="mt-6 flex gap-3">
        <Button asChild>
          <Link to="/wissen">{t('homeToKnowledge')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pattern">{t('homeToPatterns')}</Link>
        </Button>
      </nav>
    </div>
  )
}
