import { useEffect, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@/features/i18n/translations'
import { translateQuery } from './translate'

const DEBOUNCE_MS = 400

/**
 * Liefert den Suchbegriff plus seine live übersetzten Varianten in allen
 * unterstützten Sprachen (siehe translateQuery), damit die Suche
 * sprachübergreifend funktioniert – z. B. findet "Diamonds" auch ein
 * Muster mit dem Titel "Einfache Diamanten". Übersetzt wird debounced
 * (nicht bei jedem Tastenanschlag) und in ALLE Sprachen, nicht nur die
 * aktuelle UI-Sprache → die andere: der Suchbegriff kann in einer anderen
 * Sprache getippt sein als die UI gerade eingestellt ist (siehe
 * translateQuery, das die Quellsprache selbst erkennt).
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
