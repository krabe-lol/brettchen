import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { deleteAccount, updateEmail, updatePassword, updateUsername } from '@/lib/strapi/auth'
import { MIN_PASSWORD_LENGTH, passwordContainsUsername } from '@/lib/passwordPolicy'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

/**
 * One form for username/email/password together (new password stays
 * empty to leave it unchanged) - saving opens a dialog that asks for the
 * current password to confirm, then applies whichever fields actually
 * changed. Account deletion is a separate, minimal section (heading,
 * description, button) whose own dialog explains the consequences and
 * asks for the current password again.
 */
export function AccountSettingsCard() {
  const { user, token, logout, setSession } = useAuth()
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteContentToo, setDeleteContentToo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!user || !token) return null

  // `user`/`token` are narrowed above but TS doesn't carry that into these nested handlers, hence the `!`.
  const usernameChanged = username.trim() !== user!.username
  const emailChanged = email.trim() !== (user!.email ?? '')
  const passwordChanged = newPassword.length > 0
  const hasChanges = usernameChanged || emailChanged || passwordChanged
  // Checked in this order (contains-username takes priority over length) - see the hint below.
  const passwordInvalid = !passwordChanged
    ? null
    : passwordContainsUsername(newPassword, username)
      ? 'username'
      : newPassword.length < MIN_PASSWORD_LENGTH
        ? 'length'
        : null

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    setConfirmOpen(true)
  }

  function closeConfirmDialog(open: boolean) {
    setConfirmOpen(open)
    if (!open) setConfirmPassword('')
  }

  async function handleConfirmSave(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (usernameChanged) {
        const updated = await updateUsername(username.trim(), confirmPassword, token!)
        setSession({ jwt: token!, user: { ...user!, ...updated } })
      }
      if (emailChanged) {
        const updated = await updateEmail(email.trim(), confirmPassword, token!)
        setSession({ jwt: token!, user: { ...user!, ...updated } })
      }
      if (passwordChanged) {
        await updatePassword(confirmPassword, newPassword, token!)
        setNewPassword('')
      }
      closeConfirmDialog(false)
      toast(t('accountSettingsSaved'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  function closeDeleteDialog(open: boolean) {
    setDeleteOpen(open)
    if (!open) {
      setDeletePassword('')
      setDeleteContentToo(false)
    }
  }

  async function handleConfirmDelete(e: FormEvent) {
    e.preventDefault()
    setIsDeleting(true)
    try {
      await deleteAccount(deletePassword, deleteContentToo, token!)
      logout()
      navigate('/')
      toast(t('toastAccountDeleted'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">{t('accountSettingsHeading')}</h2>
        <form onSubmit={handleEditSubmit} className="mt-4 flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-username">{t('loginUsername')}</Label>
            <Input id="account-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-email">{t('registerEmail')}</Label>
            <Input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-new-password">{t('accountSettingsNewPassword')}</Label>
            <PasswordInput
              id="account-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p
              className={
                passwordChanged && passwordInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
              }
            >
              {passwordInvalid === 'username'
                ? t('passwordContainsUsernameError')
                : t('accountSettingsNewPasswordHint', { min: String(MIN_PASSWORD_LENGTH) })}
            </p>
          </div>
          <Button type="submit" className="self-start" disabled={!hasChanges || Boolean(passwordInvalid)}>
            {t('accountSettingsSave')}
          </Button>
        </form>
      </div>

      <Separator />

      <Dialog open={confirmOpen} onOpenChange={closeConfirmDialog}>
        <DialogContent>
          <DialogTitle>{t('accountSettingsConfirmHeading')}</DialogTitle>
          <form onSubmit={handleConfirmSave} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('accountSettingsConfirmHint')}</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-confirm-password">{t('accountSettingsCurrentPassword')}</Label>
              <PasswordInput
                id="account-confirm-password"
                autoFocus
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSaving || !confirmPassword}>
              {isSaving ? t('accountSettingsSaving') : t('accountSettingsSave')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div>
        <h2 className="text-xl font-semibold text-destructive">{t('accountSettingsDeleteHeading')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('accountSettingsDeleteDescription')}</p>
        <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
          {t('accountSettingsDelete')}
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogTitle>{t('accountSettingsDeleteConfirmHeading')}</DialogTitle>
          <form onSubmit={handleConfirmDelete} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('accountSettingsDeleteConfirmExplanation')}</p>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="account-delete-content" className="cursor-pointer">
                {t('accountSettingsDeleteContentLabel')}
              </Label>
              <Switch
                id="account-delete-content"
                checked={deleteContentToo}
                onCheckedChange={setDeleteContentToo}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {deleteContentToo ? t('accountSettingsDeleteContentOnHint') : t('accountSettingsDeleteContentOffHint')}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-delete-password">{t('accountSettingsCurrentPassword')}</Label>
              <PasswordInput
                id="account-delete-password"
                autoFocus
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={isDeleting || !deletePassword}>
              {isDeleting ? t('accountSettingsDeleting') : t('accountSettingsDelete')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
