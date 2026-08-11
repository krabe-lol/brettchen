import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { LanguageProvider } from '@/features/i18n/LanguageContext'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { ToastProvider } from '@/features/toast/ToastContext'
import { DisplaySettingsProvider } from '@/features/pattern-viewer/DisplaySettingsContext'
import { Header } from './Header'
import { Footer } from './Footer'
import { PreferenceSync } from './PreferenceSync'

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DisplaySettingsProvider>
          <ToastProvider>
            <AuthProvider>
              <PreferenceSync />
              <div className="mx-auto flex min-h-svh max-w-[1920px] flex-col px-6">
                <Header />
                <main className="flex-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
            </AuthProvider>
          </ToastProvider>
        </DisplaySettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
