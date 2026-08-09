import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('themeToggleToLight') : t('themeToggleToDark')}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
