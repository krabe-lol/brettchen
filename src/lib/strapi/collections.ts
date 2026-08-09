import { strapiConfig } from './config'
import type { StrapiPatternRecord } from './patterns'

export type CollectionVisibility = 'private' | 'public'

/** Strapi-Repräsentation einer Sammlung (flach, Strapi v5, ohne data/attributes-Nesting). */
export interface StrapiCollectionRecord {
  id: number
  documentId: string
  name: string
  description: string | null
  visibility: CollectionVisibility
  isDefault: boolean
  /** Nur `username` (findOne liefert zusätzlich `id`). */
  owner?: { id?: number; username: string } | null
  /** Genug Felder für PatternThumbnail/PatternCard, siehe cms/src/api/collection/controllers/collection.ts. */
  patterns: StrapiPatternRecord[]
  /** Nur `id`, um Anzahl/eigene Mitgliedschaft zu prüfen – keine Namen nötig. */
  subscribers: { id: number }[]
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data
}

/** Legt eine neue Sammlung an – standardmäßig privat, wenn `visibility` nicht gesetzt wird. */
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

/** Alle eigenen Sammlungen, unabhängig von der Sichtbarkeit (legt die Standard-Sammlung bei Bedarf an). */
export async function fetchMyCollections(token: string): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/mine`, { headers: authHeaders(token) })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}

/** Öffentliche Sammlungen aller Personen, zum Durchstöbern/Abonnieren – auch ohne Login. */
export async function fetchPublicCollections(): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}

/** Öffentliche Sammlungen sieht jede:r, private nur die besitzende Person (daher der optionale Token). */
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

/** Fügt ein Muster der eigenen Standard-Sammlung hinzu (legt sie serverseitig bei Bedarf an). */
export async function addToDefaultCollection(patternId: string, token: string): Promise<StrapiCollectionRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/default/patterns/${patternId}`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord
}

/** Nur öffentliche, fremde Sammlungen können abonniert werden. */
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

/** Sammlungen anderer Personen, die die eigene Person abonniert hat. */
export async function fetchMySubscriptions(token: string): Promise<StrapiCollectionRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/collections/subscriptions`, {
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiCollectionRecord[]
}
