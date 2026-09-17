import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useTranslatedSearchTerms } from '@/lib/useTranslatedSearchTerms'
import { bestScore, isMatch, rankBySearchRelevance } from '@/lib/fuzzyMatch'
import { Input } from '@/components/ui/input'
import { fetchPublishedPatterns, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { fetchPublicCollections, type StrapiCollectionRecord } from '@/lib/strapi/collections'

const MAX_RESULTS_PER_GROUP = 5

interface SearchBarProps {
  /** Focuses the input as soon as it's shown - used for the mobile icon-to-bar expansion in the header. */
  autoFocus?: boolean
  /** Called once actual navigation happens (submit or clicking a result) - e.g. closes the mobile search bar in the header. */
  onNavigate?: () => void
}

/**
 * Header search bar: searches pattern titles, collection titles and style
 * tags. Loads published patterns/public collections once on first mount
 * (the header isn't remounted per page) and filters client-side after
 * that, same approach as the existing filters on PatternListPage.
 */
export function SearchBar({ autoFocus, onNavigate }: SearchBarProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [patterns, setPatterns] = useState<StrapiPatternRecord[]>([])
  const [collections, setCollections] = useState<StrapiCollectionRecord[]>([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetchPublishedPatterns()
      .then(setPatterns)
      .catch(() => {})
    fetchPublicCollections()
      .then(setCollections)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const searchTerms = useTranslatedSearchTerms(query)

  const results = useMemo(() => {
    if (searchTerms.length === 0) return { patterns: [], collections: [], styleTags: [] }

    const matchedPatterns = rankBySearchRelevance(patterns, searchTerms, (pattern) => [
      pattern.title,
      ...(pattern.style ?? []),
    ]).slice(0, MAX_RESULTS_PER_GROUP)

    const matchedCollections = rankBySearchRelevance(collections, searchTerms, (collection) => [collection.name]).slice(
      0,
      MAX_RESULTS_PER_GROUP,
    )

    const styleTagScores = new Map<string, number>()
    for (const pattern of patterns) {
      for (const tag of pattern.style ?? []) {
        const score = bestScore(tag, searchTerms)
        if (isMatch(score) && (styleTagScores.get(tag) ?? -Infinity) < score) styleTagScores.set(tag, score)
      }
    }
    const styleTags = [...styleTagScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, MAX_RESULTS_PER_GROUP)

    return { patterns: matchedPatterns, collections: matchedCollections, styleTags }
  }, [searchTerms, patterns, collections])

  const hasResults = results.patterns.length > 0 || results.collections.length > 0 || results.styleTags.length > 0

  function closeAndClear() {
    setIsOpen(false)
    setQuery('')
    onNavigate?.()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/suche?q=${encodeURIComponent(q)}`)
    closeAndClear()
  }

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t('headerSearchPlaceholder')}
          className="h-9 pl-8"
        />
      </div>
      {isOpen && query.trim() !== '' && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {!hasResults && <p className="px-3 py-2 text-sm text-muted-foreground">{t('headerSearchNoResults')}</p>}
          {results.patterns.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">{t('headerSearchResultsPatterns')}</p>
              {results.patterns.map((pattern) => (
                <Link
                  key={pattern.id}
                  to={`/pattern/${pattern.slug}`}
                  onClick={closeAndClear}
                  className="block px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {pattern.title}
                </Link>
              ))}
            </div>
          )}
          {results.collections.length > 0 && (
            <div className="border-t py-1">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">{t('headerSearchResultsCollections')}</p>
              {results.collections.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/collection/${collection.documentId}`}
                  onClick={closeAndClear}
                  className="block px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {collection.name}
                </Link>
              ))}
            </div>
          )}
          {results.styleTags.length > 0 && (
            <div className="border-t py-1">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">{t('headerSearchResultsStyleTags')}</p>
              {results.styleTags.map((tag) => (
                <Link
                  key={tag}
                  to={`/pattern?style=${encodeURIComponent(tag)}`}
                  onClick={closeAndClear}
                  className="block px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
