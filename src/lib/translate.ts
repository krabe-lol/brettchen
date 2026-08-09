import type { Language } from '@/features/i18n/translations'

const cache = new Map<string, string>()

/**
 * Translates a search term via the free MyMemory API so search works across
 * languages (e.g. "Diamonds" also finds a pattern titled "Einfache
 * Diamanten"), without maintaining a synonym list. Source language is
 * `autodetect`, not the current UI language - the query may be typed in a
 * different language, and `autodetect` also returns a real translation
 * instead of an unrelated translation-memory hit (tested: explicit `en|de`
 * turned "Diamonds" into "Rauten", `autodetect|de` correctly into
 * "Diamanten"). Falls back to the original term on network/rate-limit
 * errors so search degrades instead of failing.
 */
export async function translateQuery(query: string, targetLang: Language): Promise<string> {
  const trimmed = query.trim()
  if (!trimmed) return trimmed

  const cacheKey = `${targetLang}|${trimmed.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=autodetect|${targetLang}`
    const response = await fetch(url)
    if (!response.ok) return trimmed
    const data = await response.json()
    const translated: string = data?.responseData?.translatedText ?? trimmed
    cache.set(cacheKey, translated)
    return translated
  } catch {
    return trimmed
  }
}
