import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { checkUsernameAvailable, registerUsernameOnly } from '@/lib/strapi/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

export function RegisterPage() {
  const { setSession } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const trimmed = username.trim()
    if (trimmed.length < 3) {
      setUsernameStatus('idle')
      return
    }
    setUsernameStatus('checking')
    const handle = setTimeout(() => {
      checkUsernameAvailable(trimmed)
        .then((available) => setUsernameStatus(available ? 'available' : 'taken'))
        .catch(() => setUsernameStatus('idle'))
    }, 400)
    return () => clearTimeout(handle)
  }, [username])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await registerUsernameOnly(username.trim(), password, email.trim() || undefined)
      setSession(result)
      navigate('/profil')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registerError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const usernameStatusText: Record<Exclude<UsernameStatus, 'idle'>, string> = {
    checking: t('registerUsernameChecking'),
    available: t('registerUsernameAvailable'),
    taken: t('registerUsernameTaken'),
  }

  return (
    <div className="flex justify-center py-12">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>{t('registerHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t('loginUsername')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                required
              />
              <p
                className={
                  usernameStatus === 'taken'
                    ? 'text-xs text-destructive'
                    : usernameStatus === 'available'
                      ? 'text-xs text-green-600 dark:text-green-500'
                      : 'text-xs text-muted-foreground'
                }
              >
                {usernameStatus === 'idle' ? t('registerUsernameTooShort') : usernameStatusText[usernameStatus]}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('loginPassword')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">{t('registerPasswordHint')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('registerEmail')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">{t('registerEmailHint')}</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting || usernameStatus === 'taken'}>
              {isSubmitting ? t('registerSubmitting') : t('registerSubmit')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('registerHaveAccount')}{' '}
              <Link to="/login" className="underline">
                {t('registerLoginLink')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
