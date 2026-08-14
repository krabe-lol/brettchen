import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Shuffle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { AccountSettingsCard } from '@/features/auth/AccountSettingsCard'
import { DisplaySettingsCard } from '@/features/pattern-viewer/DisplaySettingsCard'
import { PatternDiagrams } from '@/features/pattern-viewer/PatternDiagrams'
import { useDisplaySettings, useSaveDisplaySettingsAsDefault } from '@/features/pattern-viewer/DisplaySettingsContext'
import { fetchPublishedPatterns, toPattern, type StrapiPatternRecord } from '@/lib/strapi/patterns'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Random index different from `excludeIndex`, as long as the list has more than one entry. */
function pickRandomIndex(length: number, excludeIndex: number | null): number {
  if (length <= 1) return 0
  let index = Math.floor(Math.random() * length)
  while (index === excludeIndex) index = Math.floor(Math.random() * length)
  return index
}

export function SettingsPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth()
  const { t } = useLanguage()
  const { settings: displaySettings, setSettings: setDisplaySettings } = useDisplaySettings()
  const {
    onSaveAsDefault,
    isSaving: isSavingDisplay,
    isAvailable: canSaveDisplayDefault,
    hasChanges: hasDisplayChanges,
  } = useSaveDisplaySettingsAsDefault()

  const [previewPatterns, setPreviewPatterns] = useState<StrapiPatternRecord[]>([])
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchPublishedPatterns()
      .then((patterns) => {
        setPreviewPatterns(patterns)
        if (patterns.length > 0) setPreviewIndex(pickRandomIndex(patterns.length, null))
      })
      .catch(() => {})
  }, [])

  if (isAuthLoading) return null
  if (!user || !token) return <Navigate to="/login" replace />

  const previewRecord = previewIndex !== null ? previewPatterns[previewIndex] : null
  const previewPattern = previewRecord ? toPattern(previewRecord) : null

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('settingsHeading')}</h1>

      <Tabs defaultValue="account" orientation="vertical" className="mt-8 flex-col sm:flex-row gap-12">
        <TabsList className="sm:w-48">
          <TabsTrigger value="account">{t('accountSettingsHeading')}</TabsTrigger>
          <TabsTrigger value="display">{t('displaySettingsHeading')}</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettingsCard />
        </TabsContent>

        <TabsContent value="display">
          <div>
            <h2 className="text-xl font-semibold">{t('displaySettingsHeading')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('settingsDisplayIntro')}</p>
          </div>
          <div className="mt-6 flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
            <div className="w-full lg:w-80 lg:shrink-0">
              <DisplaySettingsCard
                settings={displaySettings}
                onChange={setDisplaySettings}
                onSaveAsDefault={onSaveAsDefault}
                isSavingDefault={isSavingDisplay}
                canSaveAsDefault={canSaveDisplayDefault}
                hasChangesToSave={hasDisplayChanges}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-sm font-medium">{t('settingsPreviewHeading')}</h3>
                {previewPatterns.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewIndex((current) => pickRandomIndex(previewPatterns.length, current))}
                  >
                    <Shuffle /> {t('settingsPreviewShuffle')}
                  </Button>
                )}
              </div>
              {previewPattern ? (
                <div className="mt-4 flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
                  <PatternDiagrams pattern={previewPattern} palette={previewPattern.defaultPalette} />
                </div>
              ) : (
                <p className="mt-4 text-muted-foreground">{t('profileLoading')}</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
