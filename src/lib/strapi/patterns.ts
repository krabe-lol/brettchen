import { strapiConfig } from './config'
import type { Pattern } from '@/features/pattern-viewer/types'

/**
 * "draft" is only visible to its creator (see /patterns/mine), "published"
 * to everyone. "in_review"/"rejected" exist in the schema for a future
 * moderation workflow but aren't set by the frontend yet.
 */
export type ModerationStatus = 'draft' | 'in_review' | 'published' | 'rejected'

/** Strapi representation of a pattern (flat, Strapi v5, no data/attributes nesting). */
export interface StrapiPatternRecord {
  id: number
  documentId: string
  title: string
  slug: string
  summary: string | null
  numTablets: number
  holesPerTablet: number
  numRows: number
  threading: Pattern['threading']
  turningSequence: Pattern['turningSequence']
  defaultPalette: Pattern['defaultPalette']
  style: string[] | null
  notes: string | null
  source: string | null
  moderationStatus: ModerationStatus
  createdAt: string
  /** Set automatically on save (see pattern.ts backend controller): true if turning nets to zero twist for every tablet. */
  isTwistNeutral: boolean
  /** Set automatically on save (see pattern.ts backend controller and render/difficulty.ts) - only used for filtering, live display recomputes via computeDifficulty instead. */
  difficulty: 'easy' | 'medium' | 'hard'
  /** 1-based row number where the turning sequence starts repeating (optional), see WovenBandDiagram. */
  repeatFromRow: number | null
  /** Weft color slot (optional) - counts as used even without a threading hole referencing it. */
  weftColorSlot: string | null
  /** Tablet indices excluded from the twist-neutrality check, see Pattern.twistExemptTablets. */
  twistExemptTablets: number[] | null
  /** Only `username` on find/mine, plus `id` on findOne (see cms/src/api/pattern/controllers/pattern.ts). */
  author?: { id?: number; username: string } | null
  /** Only populated on findOne/update/remix; null once the remix link has broken. */
  remixOf?: { title: string; slug: string } | null
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** Random string, deliberately unrelated to the title (used for the /pattern/:slug URL). */
function randomSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`)
  }
  return data
}

/** Shared request body for create/update - excludes `slug` and `moderationStatus`, which each caller sets differently. */
function toPatternPayload(pattern: Pattern) {
  return {
    title: pattern.title,
    summary: pattern.summary,
    numTablets: pattern.numTablets,
    holesPerTablet: pattern.holesPerTablet,
    numRows: pattern.numRows,
    threading: pattern.threading,
    turningSequence: pattern.turningSequence,
    defaultPalette: pattern.defaultPalette,
    style: pattern.style,
    notes: pattern.notes,
    source: pattern.sourceUrl,
    repeatFromRow: pattern.repeatFromRow,
    weftColorSlot: pattern.weftColorSlotId,
    twistExemptTablets: pattern.twistExemptTablets,
  }
}

/** `author` is set server-side from the authenticated user (see cms/src/api/pattern/controllers/pattern.ts), not from the request body - Strapi rejects client-set relations to the User model. */
export async function createPattern(
  pattern: Pattern,
  moderationStatus: 'draft' | 'published',
  token: string,
): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      data: { ...toPatternPayload(pattern), slug: randomSlug(), moderationStatus },
    }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/** Loads all patterns of the logged-in user via the dedicated `/patterns/mine` route (filtering by `author` on the standard find route isn't allowed, same reason as in `createPattern`). */
export async function fetchMyPatterns(token: string): Promise<StrapiPatternRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/mine`, {
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord[]
}

/** Loads all published patterns - works without login. The server always returns only `moderationStatus: 'published'` here, regardless of query params (see pattern.find in the backend). */
export async function fetchPublishedPatterns(): Promise<StrapiPatternRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord[]
}

/** All style tags actually used in the given patterns, deduplicated and sorted - for autocomplete/filters. */
export function collectStyleTags(patterns: StrapiPatternRecord[]): string[] {
  const tags = new Set<string>()
  for (const pattern of patterns) {
    for (const tag of pattern.style ?? []) tags.add(tag)
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
}

/** Loads a single pattern by slug (not documentId), as used by /pattern/:slug links. Published patterns are visible to everyone; drafts only to their creator, hence the optional token (see pattern.findOne in the backend). 404s for an unknown slug or someone else's draft. */
export async function fetchPatternBySlug(slug: string, token?: string): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${encodeURIComponent(slug)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/** Converts a Strapi record into the Pattern shape expected by PatternEditor/PatternViewer. */
export function toPattern(record: StrapiPatternRecord): Pattern {
  return {
    id: String(record.id),
    slug: record.slug,
    title: record.title,
    summary: record.summary ?? '',
    numTablets: record.numTablets,
    holesPerTablet: record.holesPerTablet,
    numRows: record.numRows,
    threading: record.threading,
    turningSequence: record.turningSequence,
    defaultPalette: record.defaultPalette,
    defaultNomenclatureId: null,
    createdBy: record.author?.username ?? '',
    style: record.style ?? [],
    notes: record.notes ?? '',
    sourceUrl: record.source ?? '',
    remixOf: record.remixOf ?? null,
    createdAt: record.createdAt,
    repeatFromRow: record.repeatFromRow ?? null,
    weftColorSlotId: record.weftColorSlot ?? null,
    twistExemptTablets: record.twistExemptTablets ?? [],
  }
}

/** Copies a pattern as a new draft of your own (see pattern.remix in the backend): threading, turning sequence, palette and style tags carry over, linked back to the original via `remixOf` - stays linked until removed via `removeRemixLink`. */
export async function remixPattern(documentId: string, token: string): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}/remix`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/**
 * Removes the remix-of link - only allowed once the pattern has diverged
 * enough from the source (see hasEnoughRemixDivergence in the backend
 * pattern controller), which the server enforces; throws with a
 * user-facing message otherwise.
 */
export async function removeRemixLink(documentId: string, token: string): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}/remove-remix-link`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/** Deletes a pattern permanently. The server only allows this for its creator (see pattern.delete in the backend). */
export async function deletePattern(documentId: string, token: string): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  await readJsonOrThrow(response)
}

/** Saves changes to an existing pattern. The server only allows this for its creator (see pattern.update in the backend). */
export async function updatePattern(
  documentId: string,
  pattern: Pattern,
  moderationStatus: 'draft' | 'published',
  token: string,
): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ data: { ...toPatternPayload(pattern), moderationStatus } }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}
