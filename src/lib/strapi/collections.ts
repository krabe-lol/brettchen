import { strapiConfig } from './config'
import type { StrapiPatternRecord } from './patterns'

export type CollectionVisibility = 'private' | 'public'

/** Strapi representation of a collection (flat, Strapi v5, no data/attributes nesting). */
export interface StrapiCollectionRecord {
  id: number
  documentId: string
  name: string
  description: string | null
  visibility: CollectionVisibility
  isDefault: boolean
  /** Only `username` (findOne also returns `id`). */
  owner?: { id?: number; username: string } | null
  /** Enough fields for PatternThumbnail/PatternCard, see cms/src/api/collection/controllers/collection.ts. */
  patterns: StrapiPatternRecord[]
  /** Only `id`, to check count/own membership - no names needed. */
  subscribers: { id: number }[]
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`)
  }
  return data
}

/** Creates a new collection - private by default if `visibility` isn't set. */
export async function createCollection(
  name: string,
  description: string,
  visibility: CollectionVisibility,
  token: string,
): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ data: { name, description, visibility } }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

/** All of the user's own collections, regardless of visibility (creates the default collection if needed). */
export async function fetchMyCollections(token: string): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/mine`, { headers: authHeaders(token) })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}

/** Public collections from everyone, for browsing/subscribing - works without login. */
export async function fetchPublicCollections(): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}

/** Public collections are visible to everyone, private ones only to the owner (hence the optional token). */
export async function fetchCollectionById(documentId: string, token?: string): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${documentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

export async function updateCollection(
  documentId: string,
  changes: { name?: string; description?: string; visibility?: CollectionVisibility },
  token: string,
): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${documentId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ data: changes }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

export async function deleteCollection(documentId: string, token: string): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  await readJsonOrThrow(response)
}

export async function addPatternToCollection(
  collectionId: string,
  patternId: string,
  token: string,
): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${collectionId}/patterns/${patternId}`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

export async function removePatternFromCollection(
  collectionId: string,
  patternId: string,
  token: string,
): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${collectionId}/patterns/${patternId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

/** Only public collections owned by someone else can be subscribed to. */
export async function subscribeToCollection(documentId: string, token: string): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${documentId}/subscribe`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

export async function unsubscribeFromCollection(documentId: string, token: string): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/${documentId}/subscribe`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

/** Other people's collections that the current user has subscribed to. */
export async function fetchMySubscriptions(token: string): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/subscriptions`, {
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}
