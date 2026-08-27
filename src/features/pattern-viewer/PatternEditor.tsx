import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { CountControl } from './CountControl'
import { DisplaySettingsCard } from './DisplaySettingsCard'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'
import { PatternColorEditorCard } from './PatternColorEditorCard'
import { PatternDiagrams } from './PatternDiagrams'
import { PatternInfoSection } from './PatternInfoSection'
import { useDisplaySettings, useSaveDisplaySettingsAsDefault } from './DisplaySettingsContext'
import { downloadPatternFile, pruneUnusedColors } from './patternFile'
import { isTwistNeutral } from './render/twist'
import { computeDifficulty } from './render/difficulty'
import { usePatternEditor } from './usePatternEditor'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { collectStyleTags, fetchPublishedPatterns } from '@/lib/strapi/patterns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Pattern } from './types'
import { Download, LoaderCircle, Trash } from 'lucide-react'

interface PatternEditorProps {
  initialPattern: Pattern
  /** Page heading; sits on the same line as the save button. */
  heading: string
  /** If set, shows the public/private toggle and the save button, which receive the current pattern. */
  onSave?: (pattern: Pattern, status: 'draft' | 'published') => void
  /** If set, also shows a "close" button that switches to view mode without saving (asks for confirmation first if there are unsaved changes). */
  onClose?: () => void
  /** Disables the save button and shows a loading state while onSave runs. */
  isSaving?: boolean
  /** If set, shows a "delete" button (only for existing patterns, not when creating a new one). */
  onDelete?: () => void
  /** Disables the delete button and shows a loading state while onDelete runs. */
  isDeleting?: boolean
  /**
   * Only set for an existing pattern (not when creating a new one): shows
   * the current visibility next to the heading, changes the save button to
   * "save changes", and is the starting value of the public/private toggle.
   */
  moderationStatus?: 'draft' | 'published'
}

/**
 * Editable pattern view: heading + save buttons in a header row, below
 * that structure settings (tablets/rows), threading and turning diagrams,
 * color picker, and pattern info (title/style/notes editable) as four
 * columns. A color is selected in the color column as the active paint
 * color, then applied to cells in the threading chart.
 */
export function PatternEditor({
  initialPattern,
  heading,
  onSave,
  onClose,
  isSaving,
  onDelete,
  isDeleting,
  moderationStatus,
}: PatternEditorProps) {
  const { t } = useLanguage()
  const {
    pattern,
    numTablets,
    numRows,
    minTablets,
    maxTablets,
    minRows,
    maxRows,
    setTabletCount,
    setRowCount,
    invertTurnsFrom,
    invertRow,
    moveTablet,
    moveRow,
    removeTabletAt,
    toggleOrientation,
    toggleTwistExempt,
    palette,
    paintHole,
    addColor,
    setColorHex,
    removeColor,
    title,
    setTitle,
    style,
    setStyle,
    notes,
    setNotes,
    sourceUrl,
    setSourceUrl,
    repeatFromRow,
    setRepeatFromRow,
    setWeftColorSlotId,
  } = usePatternEditor(initialPattern)

  const [activeColorSlotId, setActiveColorSlotId] = useState<string | null>(null)
  const effectiveActiveSlotId = activeColorSlotId ?? palette[0]?.slotId ?? null

  const { settings: displaySettings, setSettings: setDisplaySettings } = useDisplaySettings()
  const {
    onSaveAsDefault: onSaveDisplaySettingsAsDefault,
    isSaving: isSavingDisplayDefault,
    isAvailable: canSaveDisplayDefault,
    hasChanges: hasDisplayChanges,
  } = useSaveDisplaySettingsAsDefault()
  const [visibility, setVisibility] = useState<'draft' | 'published'>(
    moderationStatus === 'published' ? 'published' : 'draft',
  )

  const [styleSuggestions, setStyleSuggestions] = useState<string[]>([])
  useEffect(() => {
    fetchPublishedPatterns()
      .then((patterns) => setStyleSuggestions(collectStyleTags(patterns)))
      .catch(() => {})
  }, [])

  function handleRepeatFromRowChange(raw: string) {
    if (raw === '') {
      setRepeatFromRow(null)
      return
    }
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return
    setRepeatFromRow(Math.max(1, Math.min(numRows, Math.round(parsed))))
  }

  function handleAddColor(hex: string) {
    setActiveColorSlotId(addColor(hex))
  }

  function handleRemoveColor(slotId: string) {
    removeColor(slotId)
    if (activeColorSlotId === slotId) setActiveColorSlotId(null)
  }

  function handleDelete() {
    if (window.confirm(t('editorDeleteConfirm'))) {
      onDelete?.()
    }
  }

  function handleExport() {
    downloadPatternFile(pattern)
  }


  /**
   * Removes unused colors locally too (so `pattern` matches the saved
   * state afterward and "save changes" correctly disables again) - without
   * this local sync, the removed color would only disappear after a page
   * reload, since `initialPattern` in `usePatternEditor` is only adopted on mount.
   */
  function pruneAndSyncColors(): Pattern {
    const pruned = pruneUnusedColors(pattern)
    for (const slot of palette) {
      if (!pruned.defaultPalette.some((s) => s.slotId === slot.slotId)) removeColor(slot.slotId)
    }
    return pruned
  }

  function saveWithPrunedColors(status: 'draft' | 'published') {
    onSave?.(pruneAndSyncColors(), status)
  }

  /**
   * For an existing pattern ("save changes"), there's nothing to do as
   * long as neither the content nor the visibility differs from the
   * last-loaded/saved state - `initialPattern` automatically reflects the
   * new state after a successful save (see PatternDetailPage.handleSave),
   * so the comparison stays correct afterward too. For a new, not-yet-saved
   * pattern ("save pattern"), there's no saved state to compare against - always active there.
   */
  const hasUnsavedChanges =
    moderationStatus === undefined ||
    JSON.stringify(pattern) !== JSON.stringify(initialPattern) ||
    visibility !== (moderationStatus === 'published' ? 'published' : 'draft')

  /** Closes without saving; asks for confirmation first if there are unsaved changes. */
  function handleClose() {
    if (hasUnsavedChanges && !window.confirm(t('editorUnsavedChangesConfirm'))) return
    onClose?.()
  }

  /**
   * Warns when leaving as long as an existing pattern has unsaved changes
   * (not when creating a new one - there `hasUnsavedChanges` is always
   * true, even with no input, see above). Two cases: `beforeunload` for
   * closing/reloading the tab or typing a URL (the browser always shows
   * its own, non-customizable text), `useBlocker` for in-app navigation
   * (React Router links).
   */
  const warnBeforeLeaving = Boolean(onSave) && moderationStatus !== undefined && hasUnsavedChanges

  useEffect(() => {
    if (!warnBeforeLeaving) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [warnBeforeLeaving])

  const blocker = useBlocker(warnBeforeLeaving)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(t('editorUnsavedChangesConfirm'))) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, t])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {heading}
          {moderationStatus && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {moderationStatus === 'published' ? t('profilePublished') : t('profileDraft')}
            </span>
          )}
        </h1>
        <div className="flex w-full flex-wrap items-center gap-4 lg:w-auto">
          <Button
            type="button"
            size="icon"
            variant="outline"
            title={t('editorExport')}
            aria-label={t('editorExport')}
            onClick={handleExport}
          >
            <Download />
          </Button>
          {onDelete && (
            <Button size="icon" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash />}
            </Button>
          )}
          {onSave && (
            <>
              <ToggleGroup
                type="single"
                spacing="none"
                size="default"
                value={visibility}
                onValueChange={(value) => value && setVisibility(value as 'draft' | 'published')}
              >
                <ToggleGroupItem value="draft">{t('profileDraft')}</ToggleGroupItem>
                <ToggleGroupItem value="published">{t('profilePublished')}</ToggleGroupItem>
              </ToggleGroup>
              <Button
                type="button"
                onClick={() => saveWithPrunedColors(visibility)}
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? t('editorSaving') : t('editorSave')}
              </Button>
            </>
          )}
          {onClose && (
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('closeLabel')}
            </Button>
          )}
        </div>
      </div>

      {/* Below 'lg' (tablet/phone): info directly below the title. From 'lg' (desktop) up: below the colors instead, see further down. */}
      <div className="mt-4 max-w-md lg:hidden">
        <PatternInfoSection
          title={title}
          createdBy={pattern.createdBy}
          style={style}
          notes={notes}
          sourceUrl={sourceUrl}
          remixOf={pattern.remixOf}
          createdAt={pattern.createdAt}
          isTwistNeutral={isTwistNeutral(pattern)}
          difficulty={computeDifficulty(pattern)}
          styleSuggestions={styleSuggestions}
          editable
          onTitleChange={setTitle}
          onStyleChange={setStyle}
          onNotesChange={setNotes}
          onSourceUrlChange={setSourceUrl}
        />
      </div>

      {/* Below 'lg' (tablet/phone): display options behind a button+overlay, see DisplaySettingsDialog. */}
      <div className="mt-4 lg:hidden">
        <DisplaySettingsDialog
          displaySettings={displaySettings}
          onDisplaySettingsChange={setDisplaySettings}
          onSaveAsDefault={onSaveDisplaySettingsAsDefault}
          isSavingDisplayDefault={isSavingDisplayDefault}
          canSaveDisplayDefault={canSaveDisplayDefault}
          hasDisplayChangesToSave={hasDisplayChanges}
        />
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
          <Card>
            <CardHeader>
              <CardTitle>{t('editorSettingsHeading')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CountControl
                label={t('editorTablets')}
                value={numTablets}
                min={minTablets}
                max={maxTablets}
                onChange={setTabletCount}
              />
              <CountControl
                label={t('editorRows')}
                value={numRows}
                min={minRows}
                max={maxRows}
                onChange={setRowCount}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repeat-from-row">{t('editorRepeatFromRow')}</Label>
                <Input
                  id="repeat-from-row"
                  type="number"
                  min={1}
                  max={numRows}
                  value={repeatFromRow ?? ''}
                  onChange={(e) => handleRepeatFromRowChange(e.target.value)}
                  placeholder={t('editorRepeatFromRowPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('editorRepeatFromRowHint')}</p>
              </div>
            </CardContent>
          </Card>

          {/* From 'lg' (desktop) up: display options as a permanent sidebar again instead of an overlay. */}
          <div className="hidden lg:block">
            <DisplaySettingsCard
              settings={displaySettings}
              onChange={setDisplaySettings}
              onSaveAsDefault={onSaveDisplaySettingsAsDefault}
              isSavingDefault={isSavingDisplayDefault}
              canSaveAsDefault={canSaveDisplayDefault}
              hasChangesToSave={hasDisplayChanges}
            />
          </div>
        </div>

        <PatternDiagrams
          pattern={pattern}
          palette={palette}
          onThreadingCellClick={
            effectiveActiveSlotId !== null
              ? (tabletIndex, holeIndex) => paintHole(tabletIndex, holeIndex, effectiveActiveSlotId)
              : undefined
          }
          onOrientationClick={toggleOrientation}
          onMoveTablet={moveTablet}
          onRemoveTablet={removeTabletAt}
          onWeaveCellClick={invertTurnsFrom}
          onInvertRow={invertRow}
          onMoveRow={moveRow}
          onToggleTwistExempt={toggleTwistExempt}
          onWeftColorChange={setWeftColorSlotId}
        />

        <div className="flex w-full flex-col gap-6 lg:w-56 lg:shrink-0">
          <PatternColorEditorCard
            pattern={pattern}
            palette={palette}
            activeSlotId={effectiveActiveSlotId}
            onSelectActive={setActiveColorSlotId}
            onColorHexChange={setColorHex}
            onAddColor={handleAddColor}
            onRemoveColor={handleRemoveColor}
          />
          {/* From 'lg' (desktop) up: info below the colors again instead of below the title. */}
          <div className="hidden lg:block">
            <PatternInfoSection
              title={title}
              createdBy={pattern.createdBy}
              style={style}
              notes={notes}
              sourceUrl={sourceUrl}
              remixOf={pattern.remixOf}
              createdAt={pattern.createdAt}
              isTwistNeutral={isTwistNeutral(pattern)}
              difficulty={computeDifficulty(pattern)}
              styleSuggestions={styleSuggestions}
              editable
              onTitleChange={setTitle}
              onStyleChange={setStyle}
              onNotesChange={setNotes}
              onSourceUrlChange={setSourceUrl}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
