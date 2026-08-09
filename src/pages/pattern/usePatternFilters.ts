import { useMemo, useState } from 'react'
import { collectStyleTags, type StrapiPatternRecord } from '@/lib/strapi/patterns'

export type TwistFilter = 'all' | 'neutral' | 'not-neutral'

/** Shared tablet-count/style-tag/twist filtering for PatternListPage and MyPatternListPage. */
export function usePatternFilters(patterns: StrapiPatternRecord[], initialStyleFilter: string[] = []) {
  const [twistFilter, setTwistFilter] = useState<TwistFilter>('all')
  const [minTablets, setMinTablets] = useState('')
  const [maxTablets, setMaxTablets] = useState('')
  const [styleFilter, setStyleFilter] = useState<string[]>(initialStyleFilter)

  const styleSuggestions = useMemo(() => collectStyleTags(patterns), [patterns])

  const filteredPatterns = patterns.filter((pattern) => {
    if (twistFilter === 'neutral' && !pattern.isTwistNeutral) return false
    if (twistFilter === 'not-neutral' && pattern.isTwistNeutral) return false
    if (minTablets !== '' && pattern.numTablets < Number(minTablets)) return false
    if (maxTablets !== '' && pattern.numTablets > Number(maxTablets)) return false
    // Patterns matching at least one selected style tag (not all of them).
    if (styleFilter.length > 0 && !styleFilter.some((tag) => pattern.style?.includes(tag))) return false
    return true
  })

  return {
    twistFilter,
    setTwistFilter,
    minTablets,
    setMinTablets,
    maxTablets,
    setMaxTablets,
    styleFilter,
    setStyleFilter,
    styleSuggestions,
    filteredPatterns,
  }
}
