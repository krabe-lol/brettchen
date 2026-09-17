import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { parseAnyPatternFile, patternFromFile, PatternFileError, type PatternFile } from './patternFile'
import { createPattern } from '@/lib/strapi/patterns'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { useToast } from '@/features/toast/ToastContext'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { errorMessage } from '@/lib/utils'

/**
 * All the state/DOM for pattern import, meant to be rendered by Header
 * OUTSIDE the user-menu's DropdownMenuContent (see ImportPatternsMenuItem
 * below) - Radix unmounts DropdownMenuContent's subtree the instant an
 * item is selected and the menu closes, so a file input (or dialog state)
 * living inside it never gets the chance to receive the picked file.
 * `openPicker` is the only thing the menu item itself needs.
 */
export function useImportPatterns(token: string, createdBy: string) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<PatternFile[] | null>(null)
  const [visibility, setVisibility] = useState<'draft' | 'published'>('draft')
  const [isImporting, setIsImporting] = useState(false)

  function openPicker() {
    inputRef.current?.click()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPendingFiles(parseAnyPatternFile(new Uint8Array(await file.arrayBuffer())))
      setVisibility('draft')
    } catch (err) {
      toast(t(err instanceof PatternFileError ? err.messageKey : 'patternFileInvalidFormat'), { variant: 'error' })
    }
  }

  async function confirmImport() {
    if (!pendingFiles) return
    setIsImporting(true)
    try {
      const created = []
      for (const patternFile of pendingFiles) {
        created.push(await createPattern(patternFromFile(patternFile, createdBy), visibility, token))
      }
      setPendingFiles(null)
      toast(t('patternImportSuccess', { count: String(created.length) }))
      navigate(created.length === 1 ? `/pattern/${created[0].slug}` : '/my-patterns')
    } catch (err) {
      toast(errorMessage(err, t('patternSaveError')), { variant: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  const dialogAndInput: ReactNode = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.zip,.twt,application/json,application/zip"
        className="hidden"
        onChange={handleFileChange}
      />
      <Dialog open={pendingFiles !== null} onOpenChange={(open) => !open && !isImporting && setPendingFiles(null)}>
        <DialogContent>
          <DialogTitle>{t('patternImportPreviewHeading')}</DialogTitle>
          <ul className="flex max-h-64 flex-col gap-1 overflow-auto text-sm">
            {pendingFiles?.map((file, i) => (
              <li key={i} className="rounded bg-muted px-2 py-1">
                {file.title || t('patternImportUntitled')}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm text-muted-foreground">{t('patternImportVisibilityLabel')}</Label>
            <ToggleGroup
              type="single"
              spacing="none"
              value={visibility}
              onValueChange={(value) => value && setVisibility(value as 'draft' | 'published')}
            >
              <ToggleGroupItem value="draft">{t('profileDraft')}</ToggleGroupItem>
              <ToggleGroupItem value="published">{t('profilePublished')}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingFiles(null)} disabled={isImporting}>
              {t('closeLabel')}
            </Button>
            <Button type="button" onClick={confirmImport} disabled={isImporting}>
              {isImporting ? t('patternImporting') : t('patternImportConfirm', { count: String(pendingFiles?.length ?? 0) })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  return { openPicker, dialogAndInput }
}

/** Just the user-menu entry - the actual file input/dialog live in useImportPatterns, rendered separately by Header. */
export function ImportPatternsMenuItem({ onSelect }: { onSelect: () => void }) {
  const { t } = useLanguage()
  return (
    <DropdownMenuItem onSelect={onSelect}>
      <Upload className="size-4" />
      {t('patternImport')}
    </DropdownMenuItem>
  )
}
