import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * User-facing message for a caught error - but never the raw text of a
 * network-level failure. `fetch()` rejects with a browser-specific,
 * English-only TypeError when a request never reaches the server at all
 * (offline, DNS failure, CORS, server down) - "Failed to fetch" in Chrome,
 * "NetworkError when attempting to fetch resource." in Firefox, "Load
 * failed" in Safari. None of those are meaningful to show a user, so this
 * falls back to `fallback` for a TypeError (and for anything that isn't an
 * Error at all). A plain Error - e.g. from readJsonOrThrow, which carries
 * the server's own validation/rejection message - uses its own message,
 * since that IS meaningful.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof TypeError) return fallback
  if (err instanceof Error) return err.message
  return fallback
}
