import { useMemo, useState } from 'react'
import { collectStyleTags, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { countUsedColors } from '@/features/pattern-viewer/render/threadCounts'
import type { Difficulty } from '@/features/pattern-viewer/render/difficulty'

export type TwistFilter = 'all' | 'neutral' | 'not-neutral'
export type StyleMatchMode = 'and' | 'or'
export type DifficultyFilter = 'all' | Difficulty

/** Shared tablet-count/style-tag/color-count/difficulty/twist filtering for PatternListPage and MyPatternListPage. */
export function usePatternFilters(patterns: StrapiPatternRecord[], initialStyleFilter: string[] = []) {
  const [twistFilter, setTwistFilter] = useState<TwistFilter>('all')
  const [minTablets, setMinTablets] = useState('')
  const [maxTablets, setMaxTablets] = useState('')
  const [styleFilter, setStyleFilter] = useState<string[]>(initialStyleFilter)
  const [styleMatchMode, setStyleMatchMode] = useState<StyleMatchMode>('or')
  const [minColors, setMinColors] = useState('')
  const [maxColors, setMaxColors] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')

  const styleSuggestions = useMemo(() => collectStyleTags(patterns), [patterns])

  const filteredPatterns = patterns.filter((pattern) => {
    if (twistFilter === 'neutral' && !pattern.isTwistNeutral) return false
    if (twistFilter === 'not-neutral' && pattern.isTwistNeutral) return false
    if (minTablets !== '' && pattern.numTablets < Number(minTablets)) return false
    if (maxTablets !== '' && pattern.numTablets > Number(maxTablets)) return false
    if (styleFilter.length > 0) {
      // AND: the pattern must have every selected style tag. OR: at least one of them.
      const matches =
        styleMatchMode === 'and'
          ? styleFilter.every((tag) => pattern.style?.includes(tag))
          : styleFilter.some((tag) => pattern.style?.includes(tag))
      if (!matches) return false
    }
    if (minColors !== '' && countUsedColors(pattern) < Number(minColors)) return false
    if (maxColors !== '' && countUsedColors(pattern) > Number(maxColors)) return false
    if (difficultyFilter !== 'all' && pattern.difficulty !== difficultyFilter) return false
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
    styleMatchMode,
    setStyleMatchMode,
    minColors,
    setMinColors,
    maxColors,
    setMaxColors,
    difficultyFilter,
    setDifficultyFilter,
    filteredPatterns,
  }
}
