import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  login as loginRequest,
  refreshAccessToken,
  type AuthResult,
  type StrapiUser,
} from '@/lib/strapi/auth'

const STORAGE_KEY = 'brettchen.auth'
/** Access token lives 10 minutes (Strapi sessions, see cms/config/plugins.ts) - refresh with a safety margin. */
const REFRESH_INTERVAL_MS = 8 * 60 * 1000

interface StoredAuth {
  jwt: string
  user: StrapiUser
}

interface AuthContextValue {
  user: StrapiUser | null
  token: string | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  /** Adopts an already-obtained {jwt, user} directly (e.g. after registration/password reset). */
  setSession: (result: AuthResult) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

/**
 * Keeps login state in the browser (localStorage). The access token is only
 * valid for 10 minutes, so it's refreshed on startup and then periodically
 * via the httpOnly refresh-token cookie (see lib/strapi/auth.ts). Logs out
 * if that fails (e.g. cookie expired or cleared) instead of continuing with
 * a dead token.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  function persist(stored: StoredAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    setAuth(stored)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  function refreshAndPersist() {
    return refreshAccessToken()
      .then(({ jwt }) => fetchCurrentUser(jwt).then((user) => persist({ jwt, user })))
      .catch(() => logout())
  }

  useEffect(() => {
    if (!readStoredAuth()) {
      setIsLoading(false)
      return
    }
    refreshAndPersist().finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!auth) return
    const interval = setInterval(refreshAndPersist, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [auth])

  /**
   * localStorage is shared per browser, not per tab - another tab can log a
   * different account in/out at any time. Without this listener, this tab
   * would keep a stale `user` and wrongly pair its next refreshed JWT with
   * it (see the fetchCurrentUser comment in lib/strapi/auth.ts).
   */
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      setAuth(e.newValue ? (JSON.parse(e.newValue) as StoredAuth) : null)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  async function login(identifier: string, password: string) {
    const result = await loginRequest(identifier, password)
    persist({ jwt: result.jwt, user: result.user })
  }

  function setSession(result: AuthResult) {
    persist({ jwt: result.jwt, user: result.user })
  }

  return (
    <AuthContext.Provider
      value={{ user: auth?.user ?? null, token: auth?.jwt ?? null, isLoading, login, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
