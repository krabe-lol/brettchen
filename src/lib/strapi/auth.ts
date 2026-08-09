import { strapiConfig } from './config'
import type { DisplaySettings } from '@/features/pattern-viewer/render/orientationDisplay'

export interface StrapiUser {
  id: number
  documentId: string
  username: string
  email: string | null
  /** Saved as a user preference (see features/theme, features/i18n) - unset means system/default value. */
  themePreference?: 'light' | 'dark' | null
  languagePreference?: 'de' | 'en' | null
  /** Display options for threading/turning diagrams, see DisplaySettingsContext - unset means DEFAULT_DISPLAY_SETTINGS. */
  displaySettings?: DisplaySettings | null
}

export interface AuthResult {
  jwt: string
  user: StrapiUser
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`)
  }
  return data as T
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${strapiConfig.baseUrl}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Needed so the browser sends/sets the httpOnly refresh-token cookie (see refreshAccessToken) on this cross-origin request.
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return readJsonOrThrow<T>(response)
}

async function authFetch<T>(path: string, method: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(`${strapiConfig.baseUrl}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return readJsonOrThrow<T>(response)
}

/** Login by username or email (Strapi natively accepts both as "identifier"). */
export function login(identifier: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/local', { identifier, password })
}

/** Registration with username + password, email optional (only used for password reset). */
export function registerUsernameOnly(username: string, password: string, email?: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/local/register-username-only', { username, password, email })
}

/** Checks whether a username is still free (for live validation in the registration form). */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const response = await fetch(
    `${strapiConfig.baseUrl}/api/auth/local/username-available?username=${encodeURIComponent(username)}`,
  )
  const data = await response.json()
  return Boolean(data?.available)
}

/**
 * Renews the short-lived access token (10 minutes, see cms/config/plugins.ts
 * `jwtManagement: 'refresh'`) via the httpOnly refresh-token cookie that
 * Strapi sets on login. Called periodically by AuthContext so the access
 * token never silently expires.
 */
export function refreshAccessToken(): Promise<{ jwt: string }> {
  return postJson<{ jwt: string }>('/auth/refresh')
}

/**
 * Loads the user the given token actually belongs to. The refresh-token
 * cookie is scoped per browser, not per tab/login - with multiple logins in
 * the same browser, a `/auth/refresh` in an older tab could otherwise return
 * a token for a DIFFERENT account than that tab last showed. Re-fetching the
 * user after every refresh instead of reusing the cached one avoids that.
 */
export function fetchCurrentUser(token: string): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/users/me', 'GET', token)
}

/** Saves dark/light mode and/or language as a user preference (custom route, see cms/src/extensions/users-permissions). */
export function updateUserPreferences(
  token: string,
  changes: { themePreference?: 'light' | 'dark'; languagePreference?: 'de' | 'en'; displaySettings?: DisplaySettings },
): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/users/me/preferences', 'PUT', token, changes)
}

/** Changes the username - requires the current password (see backend). */
export function updateUsername(username: string, currentPassword: string, token: string): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/auth/local/username', 'PUT', token, { username, currentPassword })
}

/** Changes the password - requires the current password. */
export function updatePassword(currentPassword: string, newPassword: string, token: string): Promise<{ ok: true }> {
  return authFetch<{ ok: true }>('/auth/local/password', 'PUT', token, { currentPassword, newPassword })
}

/** Sets/changes the optional email address (empty string clears it) - requires the current password. */
export function updateEmail(email: string, currentPassword: string, token: string): Promise<StrapiUser> {
  return authFetch<StrapiUser>('/auth/local/email', 'PUT', token, { email, currentPassword })
}

/** Deletes the account permanently - requires the current password. */
export function deleteAccount(currentPassword: string, token: string): Promise<{ ok: true }> {
  return authFetch<{ ok: true }>('/auth/local/account/delete', 'POST', token, { currentPassword })
}

/**
 * Triggers Strapi's built-in forgot-password email. Requires a configured
 * email provider (see cms/config/plugins.ts) - fails server-side without
 * one, even for a valid email address.
 */
export function forgotPassword(email: string): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/auth/forgot-password', { email })
}

/** Sets the password using the code from the forgot-password email and logs in directly. */
export function resetPassword(code: string, password: string, passwordConfirmation: string): Promise<AuthResult> {
  return postJson<AuthResult>('/auth/reset-password', { code, password, passwordConfirmation })
}
