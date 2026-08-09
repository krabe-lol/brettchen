import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { deleteAccount, updateEmail, updatePassword, updateUsername } from '@/lib/strapi/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Zugangsdaten bearbeiten: Username, Passwort, optionale E-Mail, Konto löschen. */
export function AccountSettingsCard() {
  const { user, token, logout, setSession } = useAuth()
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [usernamePassword, setUsernamePassword] = useState('')
  const [isSavingUsername, setIsSavingUsername] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const [email, setEmail] = useState(user?.email ?? '')

  const [deleteUsernameConfirm, setDeleteUsernameConfirm] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  if (!user || !token) return null

  async function handleUsernameSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSavingUsername(true)
    try {
      if (username.trim() !== user!.username) {
        const updated = await updateUsername(username.trim(), usernamePassword, token!)
        setSession({ jwt: token!, user: { ...user!, ...updated } })
      }
      if (email.trim() !== (user!.email ?? '')) {
        const updated = await updateEmail(email.trim(), usernamePassword, token!)
        setSession({ jwt: token!, user: { ...user!, ...updated } })
      }
      setUsernamePassword('')
      toast(t('accountSettingsSaved'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
    } finally {
      setIsSavingUsername(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSavingPassword(true)
    try {
      await updatePassword(currentPassword, newPassword, token!)
      setCurrentPassword('')
      setNewPassword('')
      toast(t('accountSettingsSaved'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleDeleteSubmit(e: FormEvent) {
    e.preventDefault()
    setIsDeleting(true)
    try {
      await deleteAccount(deletePassword, token!)
      logout()
      navigate('/')
      toast(t('toastAccountDeleted'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('accountSettingsError'), { variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('accountSettingsHeading')}</h2>

      <div className="flex flex-col gap-8 mt-4">
        <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="account-username">{t('loginUsername')}</Label>
            <Input id="account-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="account-email">{t('registerEmail')}</Label>
            <Input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="account-username-password">{t('accountSettingsCurrentPassword')}</Label>
            <Input
              id="account-username-password"
              type="password"
              value={usernamePassword}
              onChange={(e) => setUsernamePassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={
              isSavingUsername ||
              !username.trim() ||
              !usernamePassword ||
              (username.trim() === user.username && email.trim() === (user.email ?? ''))
            }
          >
            {t('accountSettingsSave')}
          </Button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="account-current-password">{t('accountSettingsCurrentPassword')}</Label>
            <Input
              id="account-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="account-new-password">{t('accountSettingsNewPassword')}</Label>
            <Input
              id="account-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSavingPassword || !currentPassword || newPassword.length < 6}>
            {t('accountSettingsSave')}
          </Button>
        </form>

        <form onSubmit={handleDeleteSubmit} className="flex flex-col gap-3">
          {/* TODO: in einen Dialog auslagern */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="account-delete-username">{t('accountSettingsDeleteUsernameLabel')}</Label>
              <Input
                id="account-delete-username"
                value={deleteUsernameConfirm}
                onChange={(e) => setDeleteUsernameConfirm(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="account-delete-password">{t('accountSettingsCurrentPassword')}</Label>
              <Input
                id="account-delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting || deleteUsernameConfirm !== user.username || !deletePassword}
            >
              {t('accountSettingsDelete')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
