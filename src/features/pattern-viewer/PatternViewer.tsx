import { DisplaySettingsCard } from './DisplaySettingsCard'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'
import { PatternColorCard } from './PatternColorCard'
import { PatternDiagrams } from './PatternDiagrams'
import { PatternHighlightSettingsCard } from './PatternHighlightSettingsCard'
import { PatternInfoSection } from './PatternInfoSection'
import { useDisplaySettings, useSaveDisplaySettingsAsDefault } from './DisplaySettingsContext'
import { usePatternHighlightSettings } from './usePatternHighlightSettings'
import { downloadPatternFile } from './patternFile'
import { isTwistNeutral } from './render/twist'
import { computeDifficulty } from './render/difficulty'
import { useDisplayState } from './useDisplayState'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { CollectionBookmarkButton } from '@/features/library/CollectionBookmarkButton'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { Pattern } from './types'
import { Download, LoaderCircle, Pencil, Trash } from 'lucide-react'

interface PatternViewerProps {
  heading: string
  pattern: Pattern
  /** If set, shows a "remix" button next to the heading (for all logged-in users, including the creator). */
  onRemix?: () => void
  isRemixing?: boolean
  /** If set, shows an "edit" button next to the heading (creator only). */
  onEdit?: () => void
  /** If set, shows a "delete" button next to the heading (creator only). */
  onDelete?: () => void
  isDeleting?: boolean
  /** Pattern id for the bookmark icon; set together with `collections`/`token` when logged in (see CollectionBookmarkButton). */
  patternId?: string
  collections?: StrapiCollectionRecord[]
  token?: string | null
  onCollectionsChanged?: () => void
}

/**
 * Pattern view for visitors and logged-in users who are NOT the creator:
 * display settings and recoloring existing colors, but no structural
 * editing (no new tablets/rows/colors, no direction changes) - title/
 * style/notes are read-only. See PatternEditor for full editing by the
 * creator. Logged-in users can copy the pattern as their own draft via
 * "remix", see onRemix. The creator also lands here first after opening
 * their own pattern (not directly in the editor) and switches to full
 * editing via the "edit" button, see onEdit.
 */
export function PatternViewer({
  heading,
  pattern,
  onRemix,
  isRemixing,
  onEdit,
  onDelete,
  isDeleting,
  patternId,
  collections,
  token,
  onCollectionsChanged,
}: PatternViewerProps) {
  const { t } = useLanguage()

  function handleDelete() {
    if (window.confirm(t('editorDeleteConfirm'))) {
      onDelete?.()
    }
  }
  const { activePalette, setSlotColor, resetColors } = useDisplayState(pattern)
  const { settings: displaySettings, setSettings: setDisplaySettings } = useDisplaySettings()
  const {
    onSaveAsDefault,
    isSaving: isSavingDisplayDefault,
    isAvailable: canSaveDisplayDefault,
    hasChanges: hasDisplayChanges,
  } = useSaveDisplaySettingsAsDefault()
  const { settings: highlightSettings, setSettings: setHighlightSettings } = usePatternHighlightSettings(
    patternId,
    token ?? null,
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {patternId && collections && token && (
            <CollectionBookmarkButton
              collections={collections}
              patternId={patternId}
              token={token}
              onChanged={onCollectionsChanged ?? (() => {})}
            />
          )}
          {onRemix && (
            <Button type="button" variant="outline" onClick={onRemix} disabled={isRemixing}>
              {isRemixing ? t('patternRemixing') : t('patternRemixButton')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={t('editorExport')}
            aria-label={t('editorExport')}
            onClick={() => downloadPatternFile(pattern)}
          >
            <Download />
          </Button>
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Pencil />
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash />}
            </Button>
          )}
        </div>
      </div>

      {/* Below 'lg' (tablet/phone): info directly below the title. From 'lg' (desktop) up: below the colors instead, see further down. */}
      <div className="mt-4 max-w-md lg:hidden">
        <PatternInfoSection
          title={pattern.title}
          createdBy={pattern.createdBy}
          style={pattern.style}
          notes={pattern.notes}
          sourceUrl={pattern.sourceUrl}
          remixOf={pattern.remixOf}
          createdAt={pattern.createdAt}
          isTwistNeutral={isTwistNeutral(pattern)}
          difficulty={computeDifficulty(pattern)}
        />
      </div>

      {/* Below 'lg' (tablet/phone): display options behind a button+overlay, see DisplaySettingsDialog. */}
      <div className="mt-4 lg:hidden">
        <DisplaySettingsDialog
          displaySettings={displaySettings}
          onDisplaySettingsChange={setDisplaySettings}
          onSaveAsDefault={onSaveAsDefault}
          isSavingDisplayDefault={isSavingDisplayDefault}
          canSaveDisplayDefault={canSaveDisplayDefault}
          hasDisplayChangesToSave={hasDisplayChanges}
          highlightSettings={highlightSettings}
          onHighlightSettingsChange={setHighlightSettings}
          numRows={pattern.numRows}
          numTablets={pattern.numTablets}
        />
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        {/* Colors on the left on desktop; on mobile above the diagrams, so they stay close to the threading chart. */}
        <div className="flex w-full flex-col gap-6 lg:w-56 lg:shrink-0">
          <PatternColorCard pattern={pattern} palette={activePalette} onSlotColorChange={setSlotColor} onReset={resetColors} />
          {/* From 'lg' (desktop) up: info below the colors again instead of below the title. */}
          <div className="hidden lg:block">
            <PatternInfoSection
              title={pattern.title}
              createdBy={pattern.createdBy}
              style={pattern.style}
              notes={pattern.notes}
              sourceUrl={pattern.sourceUrl}
              remixOf={pattern.remixOf}
              createdAt={pattern.createdAt}
              isTwistNeutral={isTwistNeutral(pattern)}
              difficulty={computeDifficulty(pattern)}
            />
          </div>
        </div>

        <PatternDiagrams
          pattern={pattern}
          palette={activePalette}
          highlightSettings={highlightSettings}
          onHighlightSettingsChange={setHighlightSettings}
        />

        {/* From 'lg' (desktop) up: display options as a permanent sidebar again instead of an overlay. */}
        <div className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-6">
          <DisplaySettingsCard
            settings={displaySettings}
            onChange={setDisplaySettings}
            onSaveAsDefault={onSaveAsDefault}
            isSavingDefault={isSavingDisplayDefault}
            canSaveAsDefault={canSaveDisplayDefault}
            hasChangesToSave={hasDisplayChanges}
          />
          <PatternHighlightSettingsCard
            settings={highlightSettings}
            onChange={setHighlightSettings}
            numRows={pattern.numRows}
            numTablets={pattern.numTablets}
          />
        </div>
      </div>
    </div>
  )
}
