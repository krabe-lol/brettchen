import type { Language } from '@/features/i18n/translations'

const cache = new Map<string, string>()

/**
 * Übersetzt einen kurzen Suchbegriff über die kostenlose MyMemory-API
 * (translated.net), damit die Suche sprachübergreifend funktioniert (z. B.
 * "Diamonds" findet auch Muster mit dem Titel "Einfache Diamanten") – ohne
 * eine feste Synonymliste pflegen zu müssen. Die Quellsprache wird bewusst
 * NICHT auf die aktuelle UI-Sprache festgelegt, sondern per `autodetect` von
 * MyMemory selbst erkannt: der Suchbegriff kann in einer anderen Sprache
 * getippt sein als die UI gerade eingestellt ist, und `autodetect` liefert
 * außerdem eine echte KI-Übersetzung statt eines zufälligen
 * Übersetzungsspeicher-Treffers mit abweichender Wortwahl (getestet: bei
 * explizitem `en|de` lieferte MyMemory für "Diamonds" z. B. "Rauten" statt
 * "Diamanten", mit `autodetect|de` dagegen korrekt "Diamanten"). Ergebnisse
 * werden im Prozessspeicher gecacht, da derselbe Suchbegriff sonst bei jedem
 * Tastenanschlag erneut übersetzt würde. Bei Netzwerkfehlern oder
 * Rate-Limit wird einfach der Originalbegriff zurückgegeben – die Suche
 * bleibt dann nur auf die eingegebene Sprache beschränkt, statt
 * fehlzuschlagen.
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
