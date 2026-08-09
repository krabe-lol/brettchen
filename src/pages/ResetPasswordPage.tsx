import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { resetPassword } from '@/lib/strapi/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordPage() {
  const { setSession } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code) return
    if (password !== passwordConfirmation) {
      setError(t('resetPasswordMismatch'))
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await resetPassword(code, password, passwordConfirmation)
      setSession(result)
      navigate('/profil')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPasswordError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center py-12">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>{t('resetPasswordHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!code ? (
            <p className="text-sm text-destructive">{t('resetPasswordInvalidLink')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('resetPasswordNewPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password-confirmation">{t('resetPasswordConfirm')}</Label>
                <Input
                  id="password-confirmation"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('resetPasswordSubmitting') : t('resetPasswordSubmit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
