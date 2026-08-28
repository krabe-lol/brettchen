import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { PatternCard } from '@/features/pattern-viewer/PatternCard'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** How many of the most recently published patterns show in the "fresh off the loom" teaser. */
const FRESH_PATTERNS_COUNT = 3

/**
 * Landing page: hero, three value props, and a teaser row of the most
 * recently published patterns (real data, see freshPatterns below - not
 * the full list, that's /pattern). No "from the knowledge base" teaser
 * here on purpose - Wissen has no content yet and is hidden from nav too.
 */
export function HomePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [freshPatterns, setFreshPatterns] = useState<StrapiPatternRecord[]>([])

  useEffect(() => {
    fetchPublishedPatterns()
      .then((patterns) => setFreshPatterns(patterns.slice(0, FRESH_PATTERNS_COUNT)))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-20 py-12">
      <section className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex max-w-xl flex-col gap-5">
          <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance">{t('homeHeadline')}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{t('homeSubtitle')}</p>
          <nav className="mt-2 flex gap-3">
            <Button asChild size="lg">
              <Link to="/pattern">{t('homeToPatterns')}</Link>
            </Button>
          </nav>
        </div>
        <img
          src="/hero-loom.jpg"
          alt=""
          className="h-80 w-full max-w-md shrink-0 rounded-2xl object-cover"
        />
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(['Guides', 'Charts', 'Archive'] as const).map((key) => (
          <Card key={key} className="bg-muted/60 gap-3 border-0 p-7 shadow-none">
            <div className="bg-primary size-9 rounded-lg" />
            <h3 className="font-serif text-lg">{t(`homeFeature${key}Title`)}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t(`homeFeature${key}Body`)}</p>
          </Card>
        ))}
      </section>

      {freshPatterns.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">{t('homeFreshPatterns')}</h2>
            <Link to="/pattern" className="text-primary text-sm font-medium hover:underline">
              {t('homeToPatterns')} →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {freshPatterns.map((pattern) => (
              <PatternCard
                key={pattern.documentId}
                pattern={pattern}
                noStyleLabel={t('profileNoStyle')}
                currentUsername={user?.username}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
