import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { resetPassword } from '@/lib/strapi/auth'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { errorMessage } from '@/lib/utils'

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

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code) return
    if (password.length < MIN_PASSWORD_LENGTH) return
    if (password !== passwordConfirmation) {
      setError(t('resetPasswordMismatch'))
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await resetPassword(code, password, passwordConfirmation)
      setSession(result)
      navigate('/profile')
    } catch (err) {
      setError(errorMessage(err, t('resetPasswordError')))
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
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
                <p className={passwordTooShort ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                  {t('resetPasswordHint', { min: String(MIN_PASSWORD_LENGTH) })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password-confirmation">{t('resetPasswordConfirm')}</Label>
                <PasswordInput
                  id="password-confirmation"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting || password.length < MIN_PASSWORD_LENGTH}>
                {isSubmitting ? t('resetPasswordSubmitting') : t('resetPasswordSubmit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
