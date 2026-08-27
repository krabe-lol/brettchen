import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { forgotPassword } from '@/lib/strapi/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/utils'

export function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSent, setIsSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setIsSent(true)
    } catch (err) {
      setError(errorMessage(err, t('forgotPasswordError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center py-12">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>{t('forgotPasswordHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <p className="text-sm text-muted-foreground">{t('forgotPasswordSuccess')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t('forgotPasswordEmail')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('forgotPasswordSubmitting') : t('forgotPasswordSubmit')}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="underline">
              {t('forgotPasswordBackToLogin')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
