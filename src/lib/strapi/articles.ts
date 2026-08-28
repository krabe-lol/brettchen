import { strapiConfig } from './config'

/** Strapi representation of a knowledge-base article (flat, Strapi v5, no data/attributes nesting). */
export interface StrapiArticleRecord {
  id: number
  documentId: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  createdAt: string
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`)
  }
  return data
}

/** Loads all published articles, newest first - works without login, same as fetchPublishedPatterns. */
export async function fetchPublishedArticles(): Promise<StrapiArticleRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/articles?sort=createdAt:desc`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiArticleRecord[]
}

/** Loads a single published article by slug. 404s (via an empty array) for an unknown or unpublished slug. */
export async function fetchArticleBySlug(slug: string): Promise<StrapiArticleRecord> {
  const response = await fetch(
    `${strapiConfig.baseUrl}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}`,
  )
  const data = await readJsonOrThrow(response)
  const [article] = data.data as StrapiArticleRecord[]
  if (!article) throw new Error('Not found')
  return article
}
