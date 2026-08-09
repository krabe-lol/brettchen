import { strapiConfig } from './config'

/** Strapi v5 REST response shapes (flat entities, kein data/attributes-Nesting mehr). */
export interface StrapiListResponse<T> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface StrapiSingleResponse<T> {
  data: T
  meta: Record<string, unknown>
}

export interface StrapiQuery {
  populate?: string | string[]
  filters?: Record<string, unknown>
  sort?: string | string[]
  pagination?: { page?: number; pageSize?: number }
}

function buildQueryString(query?: StrapiQuery): string {
  if (!query) return ''
  const params = new URLSearchParams()

  if (query.populate) {
    params.set('populate', Array.isArray(query.populate) ? query.populate.join(',') : query.populate)
  }
  if (query.sort) {
    params.set('sort', Array.isArray(query.sort) ? query.sort.join(',') : query.sort)
  }
  if (query.pagination?.page) params.set('pagination[page]', String(query.pagination.page))
  if (query.pagination?.pageSize) params.set('pagination[pageSize]', String(query.pagination.pageSize))

  if (query.filters) {
    // Für einfache Fälle ausreichend. Bei tief verschachtelten Filtern später
    // auf die "qs"-Bibliothek wechseln (gleiche Serialisierung wie Strapi intern nutzt).
    for (const [key, value] of Object.entries(query.filters)) {
      params.set(`filters[${key}]`, String(value))
    }
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(path: string, query?: StrapiQuery): Promise<T> {
  const url = `${strapiConfig.baseUrl}/api${path}${buildQueryString(query)}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Strapi request failed: ${response.status} ${response.statusText} (${url})`)
  }

  return response.json() as Promise<T>
}

export const strapiClient = {
  findMany: <T>(collection: string, query?: StrapiQuery) =>
    request<StrapiListResponse<T>>(`/${collection}`, query),

  findOne: <T>(collection: string, documentId: string, query?: StrapiQuery) =>
    request<StrapiSingleResponse<T>>(`/${collection}/${documentId}`, query),
}
