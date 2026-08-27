import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface ToastItem {
  id: number
  title: string
  variant: 'success' | 'error'
}

interface ToastOptions {
  variant?: 'success' | 'error'
}

interface ToastContextValue {
  toast: (title: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

let nextId = 0

/** Short-lived success/error messages, centered at the top of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (title: string, options?: ToastOptions) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, title, variant: options?.variant ?? 'success' }])
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-md',
              item.variant === 'error'
                ? 'border-destructive/50 bg-destructive text-destructive-foreground'
                : 'border-border bg-card text-card-foreground',
            )}
          >
            <span>{item.title}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t('closeLabel')}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
