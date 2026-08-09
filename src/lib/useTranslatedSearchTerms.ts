import { useEffect, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@/features/i18n/translations'
import { translateQuery } from './translate'

const DEBOUNCE_MS = 400

/**
 * Returns the search term plus its live-translated variants in all
 * supported languages (see translateQuery), so search works across
 * languages. Debounced, and translated into ALL languages (not just the
 * current UI language) since the query itself may be typed in another one.
 */
export function useTranslatedSearchTerms(query: string): string[] {
  const trimmed = query.trim()
  const [terms, setTerms] = useState<string[]>(trimmed ? [trimmed] : [])

  useEffect(() => {
    if (!trimmed) {
      setTerms([])
      return
    }
    setTerms([trimmed])

    let cancelled = false
    const languages = SUPPORTED_LANGUAGES.map((l) => l.code)
    const timer = setTimeout(() => {
      Promise.all(languages.map((target) => translateQuery(trimmed, target))).then((translated) => {
        if (!cancelled) setTerms([...new Set([trimmed, ...translated])])
      })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  return terms
}
