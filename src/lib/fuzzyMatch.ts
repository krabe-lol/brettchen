/** Levenshtein edit distance between two short words. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  const curr = new Array(n + 1).fill(0)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/** Allowed edit distance for a "similar spelling" match, scaled to word length. */
function maxAllowedDistance(length: number): number {
  if (length <= 4) return 0
  if (length <= 7) return 1
  return 2
}

const NO_MATCH = -Infinity

/** Scores a word against `term`: exact > prefix > substring > similar spelling > no match. Higher is better. */
function wordScore(word: string, term: string): number {
  if (!term) return NO_MATCH
  if (word === term) return 100
  if (word.startsWith(term) || term.startsWith(word)) return 90 - Math.abs(word.length - term.length)
  if (word.includes(term) || term.includes(word)) return 70 - Math.abs(word.length - term.length)
  const distance = levenshtein(word, term)
  const allowed = maxAllowedDistance(Math.min(word.length, term.length))
  if (distance <= allowed) return 50 - distance * 15
  return NO_MATCH
}

/** Best word match for `term` anywhere in `text`, or NO_MATCH. */
function fuzzyScore(text: string, term: string): number {
  const lowerTerm = term.toLowerCase().trim()
  if (!lowerTerm) return NO_MATCH
  const lowerText = text.toLowerCase()
  if (lowerText.includes(lowerTerm)) return 95

  const words = lowerText.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  let best = NO_MATCH
  for (const word of words) {
    const score = wordScore(word, lowerTerm)
    if (score > best) best = score
  }
  return best
}

/** Best score of `text` against several search terms (e.g. original + translations, see useTranslatedSearchTerms). */
export function bestScore(text: string, terms: string[]): number {
  let best = NO_MATCH
  for (const term of terms) {
    const score = fuzzyScore(text, term)
    if (score > best) best = score
  }
  return best
}

export function isMatch(score: number): boolean {
  return score > NO_MATCH
}

/** Filters and sorts `items` by relevance against `terms`. `getSearchableText` returns the texts to match per item (e.g. title + style tags). */
export function rankBySearchRelevance<T>(items: T[], terms: string[], getSearchableText: (item: T) => string[]): T[] {
  return items
    .map((item) => ({
      item,
      score: Math.max(NO_MATCH, ...getSearchableText(item).map((text) => bestScore(text, terms))),
    }))
    .filter((entry) => isMatch(entry.score))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
}
