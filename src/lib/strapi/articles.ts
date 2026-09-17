import { strapiConfig } from './config'

export type ArticleCategory = 'guide' | 'history' | 'technique' | 'material'

export interface StrapiMediaRecord {
  url: string
  width: number | null
  height: number | null
}

/** Strapi representation of a knowledge-base article (flat, Strapi v5, no data/attributes nesting). */
export interface StrapiArticleRecord {
  id: number
  documentId: string
  title: string
  slug: string
  excerpt: string | null
  /** Markdown - rendered via react-markdown, see ArtikelDetailPage. */
  content: string | null
  category: ArticleCategory
  authorName: string | null
  coverImage: StrapiMediaRecord | null
  /** Short description of the intended cover photo - used as alt text once coverImage exists, and shown as a caption on the placeholder graphic until then. */
  imageCaption: string | null
  createdAt: string
}

/** Strapi's `url` is relative for local-provider uploads (e.g. "/uploads/x.jpg") - absolute already if using cloud storage. */
export function resolveMediaUrl(url: string): string {
  return url.startsWith('http') ? url : `${strapiConfig.baseUrl}${url}`
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
  const response = await fetch(`${strapiConfig.baseUrl}/api/articles?sort=createdAt:desc&populate=coverImage`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiArticleRecord[]
}

/** Loads a single published article by slug. 404s (via an empty array) for an unknown or unpublished slug. */
export async function fetchArticleBySlug(slug: string): Promise<StrapiArticleRecord> {
  const response = await fetch(
    `${strapiConfig.baseUrl}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=coverImage`,
  )
  const data = await readJsonOrThrow(response)
  const [article] = data.data as StrapiArticleRecord[]
  if (!article) throw new Error('Not found')
  return article
}
