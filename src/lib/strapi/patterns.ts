import { strapiConfig } from './config'
import type { Pattern } from '@/features/pattern-viewer/types'

/**
 * "draft" ist nur für den Ersteller sichtbar (siehe /patterns/mine),
 * "published" für alle. "in_review"/"rejected" existieren im Strapi-Schema
 * für einen späteren Moderationsworkflow, werden vom Frontend aber aktuell
 * nicht gesetzt.
 */
export type ModerationStatus = 'draft' | 'in_review' | 'published' | 'rejected'

/** Strapi-Repräsentation eines Musters (flach, Strapi v5, ohne data/attributes-Nesting). */
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
  /** Automatisch beim Speichern gesetzt (siehe pattern.ts Backend-Controller): true, wenn sich die Verdrillung bei jedem Brettchen zu 0 aufhebt. */
  isTwistNeutral: boolean
  /** 1-basierte Reihennummer, ab der sich das Drehmuster wiederholt (optional), siehe WovenBandDiagram. */
  repeatFromRow: number | null
  /** Farb-Slot des Schussfadens (optional) – gilt als benutzt, auch ohne Referenz durch ein Loch der Schärung. */
  weftColorSlot: string | null
  /** Bei find/mine nur `username` populiert, bei findOne zusätzlich `id` (siehe cms/src/api/pattern/controllers/pattern.ts). */
  author?: { id?: number; username: string } | null
  /** Nur bei findOne/update/remix populiert; null sobald der Remix-Link gebrochen ist. */
  remixOf?: { title: string; slug: string } | null
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** Rein zufällige Zeichenfolge, bewusst ohne Bezug zum Titel (z. B. für die URL /pattern/:slug). */
function randomSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data
}

/**
 * Legt ein neues Muster in Strapi an. `author` wird serverseitig aus
 * dem authentifizierten Nutzer gesetzt (siehe cms/src/api/pattern/controllers/pattern.ts),
 * nicht aus dem Request-Body – Strapi verbietet clientseitig gesetzte
 * Relationen auf das User-Model.
 */
export async function createPattern(
  pattern: Pattern,
  moderationStatus: 'draft' | 'published',
  token: string,
): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      data: {
        title: pattern.title,
        slug: randomSlug(),
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
        moderationStatus,
      },
    }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/**
 * Lädt alle Muster des eingeloggten Nutzers über die eigene
 * `/patterns/mine`-Route (siehe cms/src/api/pattern/controllers/pattern.ts):
 * Filtern per `filters[author]` über die Standard-Find-Route ist aus
 * demselben Grund wie beim Anlegen nicht möglich.
 */
export async function fetchMyPatterns(token: string): Promise<StrapiPatternRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/mine`, {
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord[]
}

/**
 * Lädt alle veröffentlichten Muster (Musterdatenbank) – auch ohne Login.
 * Der Server liefert hier IMMER nur `moderationStatus: 'published'`,
 * unabhängig von Query-Parametern (siehe pattern.find im Backend).
 */
export async function fetchPublishedPatterns(): Promise<StrapiPatternRecord[]> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns`)
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord[]
}

/** Alle im übergebenen Musterbestand tatsächlich verwendeten Stil-Tags, dedupliziert und sortiert – für Autocomplete/Filter. */
export function collectStyleTags(patterns: StrapiPatternRecord[]): string[] {
  const tags = new Set<string>()
  for (const pattern of patterns) {
    for (const tag of pattern.style ?? []) tags.add(tag)
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
}

/**
 * Lädt ein einzelnes Muster per Slug (nicht documentId) – so verlinken
 * Musterkarten (`/pattern/:slug`). Veröffentlichte Muster sind für alle
 * sichtbar; Entwürfe nur für die Ersteller-Person, daher der optionale
 * Token (siehe pattern.findOne im Backend). Wirft 404 bei unbekanntem Slug
 * oder fremden Entwürfen.
 */
export async function fetchPatternBySlug(slug: string, token?: string): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${encodeURIComponent(slug)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/** Wandelt einen Strapi-Datensatz in das für PatternEditor/PatternViewer erwartete Pattern-Format um. */
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
  }
}

/**
 * Kopiert ein veröffentlichtes fremdes Muster als neuen, eigenen Entwurf
 * (siehe pattern.remix im Backend) – Schären, Wendefolge, Palette und Stil
 * werden übernommen, verlinkt aber auf das Original (`remixOf`). Der Link
 * bricht automatisch, sobald beim Speichern genug verändert wurde.
 */
export async function remixPattern(documentId: string, token: string): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}/remix`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}

/**
 * Löscht ein Muster unwiderruflich. Der Server lässt das nur für die
 * Ersteller-Person zu (siehe pattern.delete im Backend).
 */
export async function deletePattern(documentId: string, token: string): Promise<void> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  await readJsonOrThrow(response)
}

/**
 * Speichert Änderungen an einem bestehenden Muster. Der Server lässt das nur
 * für die Ersteller-Person zu (siehe pattern.update im Backend), auch wenn
 * hier fälschlicherweise ein anderes documentId übergeben würde.
 */
export async function updatePattern(
  documentId: string,
  pattern: Pattern,
  moderationStatus: 'draft' | 'published',
  token: string,
): Promise<StrapiPatternRecord> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/patterns/${documentId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      data: {
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
        moderationStatus,
      },
    }),
  })
  const data = await readJsonOrThrow(response)
  return data.data as StrapiPatternRecord
}
