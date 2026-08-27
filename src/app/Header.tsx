import { useState } from 'react'
import { Check, Menu, Moon, Plus, Search, Sun, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { LanguageSwitcher } from '@/features/i18n/LanguageSwitcher'
import { useTheme } from '@/features/theme/ThemeContext'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { updateUserPreferences } from '@/lib/strapi/auth'
import { ImportPatternsMenuItem, useImportPatterns } from '@/features/pattern-viewer/ImportPatternsMenuItem'
import { Button } from '@/components/ui/button'
import { SearchBar } from './SearchBar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Language } from '@/features/i18n/translations'

export function Header() {
  const { user, token, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  /**
   * Called unconditionally (rules of hooks) even when logged out - the
   * import menu item itself only renders while logged in. Its dialog/file
   * input render below, OUTSIDE the user-menu's DropdownMenuContent:
   * Radix unmounts that content the instant the menu closes (which
   * happens right when the item is clicked), so anything stateful inside
   * it - the file input, the preview dialog - would never get a chance
   * to do anything.
   */
  const { openPicker: openImportPicker, dialogAndInput: importDialogAndInput } = useImportPatterns(
    token ?? '',
    user?.username ?? '',
  )

  function handleSelectLanguage(next: Language) {
    setLanguage(next)
    if (user && token) updateUserPreferences(token, { languagePreference: next }).catch(() => {})
  }

  function handleToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (user && token) updateUserPreferences(token, { themePreference: next }).catch(() => {})
  }

  return (
    <header className="flex items-center gap-2 border-b py-4 sm:gap-4">
      {!mobileSearchOpen && (
        <Link to="/" className="shrink-0 font-semibold">
          Brettchen
        </Link>
      )}

      <nav className="hidden items-center gap-4 md:flex">
        <Link to="/pattern" className="text-sm text-muted-foreground hover:text-foreground">
          {t('headerPatterns')}
        </Link>
        <Link to="/sammlungen" className="text-sm text-muted-foreground hover:text-foreground">
          {t('headerCollections')}
        </Link>
        <Button asChild size="sm">
          <Link to="/pattern/new">
            <Plus />
            {t('headerCreatePattern')}
          </Link>
        </Button>
      </nav>

      {!mobileSearchOpen && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="shrink-0 md:hidden" aria-label={t('headerMenu')}>
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/pattern">{t('headerPatterns')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/sammlungen">{t('headerCollections')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/pattern/new">{t('headerCreatePattern')}</Link>
            </DropdownMenuItem>
            {!user && (
              <>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuLabel className="sm:hidden">{t('languageSwitcherLabel')}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => handleSelectLanguage('en')} className="justify-between sm:hidden">
                  English
                  {language === 'en' && <Check className="size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelectLanguage('de')} className="justify-between sm:hidden">
                  Deutsch
                  {language === 'de' && <Check className="size-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem onSelect={handleToggleTheme} className="sm:hidden">
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme === 'dark' ? t('themeToggleToLight') : t('themeToggleToDark')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 px-1 sm:px-4">
        {mobileSearchOpen ? (
          <div className="flex w-full items-center gap-2 md:hidden">
            <SearchBar autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setMobileSearchOpen(false)}
              aria-label={t('headerSearchClose')}
            >
              <X />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileSearchOpen(true)}
            aria-label={t('headerSearchOpen')}
          >
            <Search />
          </Button>
        )}

        <div className="hidden w-full max-w-sm md:block">
          <SearchBar />
        </div>
      </div>

      {!mobileSearchOpen && (
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <User />
                  {user.username}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profil">{t('headerProfile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/meine-muster">{t('myPatternListHeading')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/meine-sammlungen">{t('myCollectionListHeading')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/einstellungen">{t('headerSettings')}</Link>
                </DropdownMenuItem>
                {token && <ImportPatternsMenuItem onSelect={openImportPicker} />}

                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('languageSwitcherLabel')}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => handleSelectLanguage('en')} className="justify-between">
                  English
                  {language === 'en' && <Check className="size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelectLanguage('de')} className="justify-between">
                  Deutsch
                  {language === 'de' && <Check className="size-4" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleToggleTheme}>
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme === 'dark' ? t('themeToggleToLight') : t('themeToggleToDark')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>{t('headerLogout')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild size="sm">
                <Link to="/login">{t('headerLogin')}</Link>
              </Button>
              <div className="hidden items-center gap-3 sm:flex">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      )}

      {token && importDialogAndInput}
    </header>
  )
}
