import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  login as loginRequest,
  refreshAccessToken,
  type AuthResult,
  type StrapiUser,
} from '@/lib/strapi/auth'

const STORAGE_KEY = 'brettchen.auth'
/** Access-Token lebt 10 Minuten (Strapi-Sessions, siehe cms/config/plugins.ts) – mit Sicherheitsabstand erneuern. */
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
  /** Übernimmt ein bereits vorliegendes {jwt, user} direkt (z. B. nach Registrierung/Passwort-Reset). */
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
 * Hält den Login-Status im Browser (localStorage). Der Access-Token ist nur
 * 10 Minuten gültig – wird daher beim Start und danach periodisch über den
 * httpOnly Refresh-Token-Cookie erneuert (siehe lib/strapi/auth.ts). Schlägt
 * das fehl (z. B. Cookie abgelaufen oder gelöscht), wird abgemeldet, statt
 * mit einem toten Token weiterzumachen ("Missing or invalid credentials").
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

  useEffect(() => {
    const stored = readStoredAuth()
    if (!stored) {
      setIsLoading(false)
      return
    }
    refreshAccessToken()
      .then(({ jwt }) => fetchCurrentUser(jwt).then((user) => persist({ jwt, user })))
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!auth) return
    const interval = setInterval(() => {
      refreshAccessToken()
        .then(({ jwt }) => fetchCurrentUser(jwt).then((user) => persist({ jwt, user })))
        .catch(() => logout())
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [auth])

  /**
   * localStorage wird pro Browser (nicht pro Tab) geteilt, ein anderer Tab
   * kann also jederzeit ein anderes Konto einloggen/ausloggen. Ohne diesen
   * Listener würde dieser Tab mit einem veralteten `user` weiterlaufen und
   * beim nächsten eigenen Refresh dessen JWT fälschlich mit dem alten
   * Nutzerobjekt verknüpfen – siehe fetchCurrentUser-Kommentar.
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
  if (!context) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return context
}
