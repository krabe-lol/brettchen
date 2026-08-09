import { strapiConfig } from './config'
import type { DisplaySettings } from '@/features/pattern-viewer/render/orientationDisplay'

export interface StrapiUser {
  id: number
  documentId: string
  username: string
  email: string | null
  /** Als Benutzerpräferenz gespeichert (siehe features/theme/features/i18n) – ungesetzt = System-/Standardwert. */
  themePreference?: 'light' | 'dark' | null
  languagePreference?: 'de' | 'en' | null
  /** Anzeigeoptionen für Schär-/Drehmuster, siehe DisplaySettingsContext – ungesetzt = DEFAULT_DISPLAY_SETTINGS. */
  displaySettings?: DisplaySettings | null
}

export interface AuthResult {
  jwt: string
  user: StrapiUser
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${strapiConfig.baseUrl}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Nötig, damit der Browser den httpOnly Refresh-Token-Cookie (siehe
    // refreshAccessToken) bei diesem Cross-Origin-Request setzt/mitschickt.
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`
    throw new Error(message)
  }

  return data as T
}

/** Login per Username oder E-Mail (Strapi unterstützt beides nativ als "identifier"). */
export function login(identifier: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/local', { identifier, password })
}

/** Registrierung mit Username + Passwort, E-Mail optional (nur fürs Passwort-zurücksetzen). */
export function registerUsernameOnly(username: string, password: string, email?: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/local/register-username-only', { username, password, email })
}

/** Prüft, ob ein Username noch frei ist (für die Live-Prüfung im Registrierungsformular). */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const response = await fetch(
    `${strapiConfig.baseUrl}/api/auth/local/username-available?username=${encodeURIComponent(username)}`,
  )
  const data = await response.json()
  return Boolean(data?.available)
}

/**
 * Erneuert den kurzlebigen Access-Token (10 Minuten, siehe cms/config/plugins.ts
 * `jwtManagement: 'refresh'`) über den httpOnly Refresh-Token-Cookie, den
 * Strapi beim Login setzt. Wird von AuthContext periodisch aufgerufen, damit
 * der Access-Token nie unbemerkt abläuft ("Missing or invalid credentials").
 */
export function refreshAccessToken(): Promise<{ jwt: string }> {
  return postJson<{ jwt: string }>('/auth/refresh')
}

/**
 * Lädt die Person, der der übergebene Token tatsächlich gehört. Der
 * Refresh-Token-Cookie ist pro Browser (nicht pro Tab/Login) gültig – bei
 * mehreren Logins im selben Browser (z. B. zwei offene Tabs mit
 * unterschiedlichen Konten) kann ein `/auth/refresh` in einem älteren Tab
 * einen Token für ein ANDERES Konto liefern, als dort zuletzt angezeigt
 * wurde. Deshalb wird der Nutzer nach jedem Refresh live nachgeladen, statt
 * das alte, im Speicher gehaltene Nutzerobjekt einfach weiterzureichen.
 */
export async function fetchCurrentUser(token: string): Promise<StrapiUser> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data as StrapiUser
}

/** Speichert Dark/Light-Mode und/oder Sprache als Benutzerpräferenz (eigene Route, siehe cms/src/extensions/users-permissions). */
export async function updateUserPreferences(
  token: string,
  changes: { themePreference?: 'light' | 'dark'; languagePreference?: 'de' | 'en'; displaySettings?: DisplaySettings },
): Promise<StrapiUser> {
  const response = await fetch(`${strapiConfig.baseUrl}/api/users/me/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(changes),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data as StrapiUser
}

async function authFetch<T>(path: string, method: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${strapiConfig.baseUrl}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Anfrage fehlgeschlagen (${response.status})`)
  }
  return data as T
}

/** Ändert den Username – verlangt das aktuelle Passwort (siehe Backend). */
export function updateUsername(username: string, currentPassword: string, token: string): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/auth/local/username', 'PUT', token, { username, currentPassword })
}

/** Ändert das Passwort – verlangt das aktuelle Passwort. */
export function updatePassword(currentPassword: string, newPassword: string, token: string): Promise<{ ok: true }> {
  return authFetch<{ ok: true }>('/auth/local/password', 'PUT', token, { currentPassword, newPassword })
}

/** Setzt/ändert die optionale E-Mail-Adresse (leerer String löscht sie) – verlangt das aktuelle Passwort. */
export function updateEmail(email: string, currentPassword: string, token: string): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/auth/local/email', 'PUT', token, { email, currentPassword })
}

/** Löscht das eigene Konto unwiderruflich – verlangt das aktuelle Passwort. */
export function deleteAccount(currentPassword: string, token: string): Promise<{ ok: true }> {
  return authFetch<{ ok: true }>('/auth/local/account/delete', 'POST', token, { currentPassword })
}

/**
 * Stößt Strapis eingebauten Passwort-vergessen-Versand an. Erfordert einen
 * konfigurierten E-Mail-Provider (siehe cms/config/plugins.ts) – ohne den
 * schlägt der Versand serverseitig fehl, auch wenn die E-Mail-Adresse
 * existiert.
 */
export function forgotPassword(email: string): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/auth/forgot-password', { email })
}

/** Setzt das Passwort über den Code aus der Passwort-vergessen-E-Mail und meldet direkt an. */
export function resetPassword(code: string, password: string, passwordConfirmation: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/reset-password', { code, password, passwordConfirmation })
}
