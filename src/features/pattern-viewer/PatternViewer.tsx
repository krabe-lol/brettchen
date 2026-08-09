import { DisplaySettingsCard } from './DisplaySettingsCard'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'
import { PatternColorCard } from './PatternColorCard'
import { PatternDiagrams } from './PatternDiagrams'
import { PatternHighlightSettingsCard } from './PatternHighlightSettingsCard'
import { PatternInfoSection } from './PatternInfoSection'
import { useDisplaySettings, useSaveDisplaySettingsAsDefault } from './DisplaySettingsContext'
import { usePatternHighlightSettings } from './usePatternHighlightSettings'
import { isTwistNeutral } from './render/twist'
import { useDisplayState } from './useDisplayState'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { CollectionBookmarkButton } from '@/features/library/CollectionBookmarkButton'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'
import type { Pattern } from './types'
import { LoaderCircle, Pencil, Trash } from 'lucide-react'

interface PatternViewerProps {
  heading: string
  pattern: Pattern
  /** Wenn gesetzt, erscheint ein "Remixen"-Button neben der Überschrift (für alle eingeloggten Personen, auch die Ersteller-Person selbst). */
  onRemix?: () => void
  isRemixing?: boolean
  /** Wenn gesetzt, erscheint ein "Bearbeiten"-Button neben der Überschrift (nur für die Ersteller-Person). */
  onEdit?: () => void
  /** Wenn gesetzt, erscheint ein "Löschen"-Button neben der Überschrift (nur für die Ersteller-Person). */
  onDelete?: () => void
  isDeleting?: boolean
  /** Musterkennung für's Sammeln-Icon; zusammen mit `collections`/`token` gesetzt, wenn eingeloggt (siehe CollectionBookmarkButton). */
  patternId?: string
  collections?: StrapiCollectionRecord[]
  token?: string | null
  onCollectionsChanged?: () => void
}

/**
 * Muster-Ansicht für Besucher und für eingeloggte Nutzer:innen, die NICHT
 * die Ersteller-Person sind: Anzeigeeinstellungen und Umfärben der
 * vorhandenen Farben, aber keine Struktur-Bearbeitung (keine neuen
 * Brettchen/Reihen/Farben, keine Richtungswechsel) – Titel/Stil/Freitext
 * nur zur Ansicht. Für die volle Bearbeitung durch die Ersteller-Person
 * siehe PatternEditor. Eingeloggte Personen können sich das Muster per
 * "Remixen" als eigenen Entwurf kopieren, siehe onRemix. Die Ersteller-Person
 * selbst landet nach dem Öffnen eines eigenen Musters ebenfalls zuerst hier
 * (nicht direkt im Editor) und wechselt über den "Bearbeiten"-Button gezielt
 * in die volle Bearbeitung, siehe onEdit.
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
  } = useSaveDisplaySettingsAsDefault()
  const {
    settings: highlightSettings,
    setSettings: setHighlightSettings,
    saveEnabled: highlightSaveEnabled,
    setSaveEnabled: setHighlightSaveEnabled,
    canSave: canSaveHighlight,
  } = usePatternHighlightSettings(patternId, token ?? null)

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

      {/* Unter 'lg' (Tablet/Handy): Infos direkt unter dem Titel. Ab 'lg' (Desktop): stattdessen unter den Farben, siehe unten. */}
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
        />
      </div>

      {/* Unter 'lg' (Tablet/Handy): Anzeigeoptionen hinter Button+Overlay, siehe DisplaySettingsDialog. */}
      <div className="mt-4 lg:hidden">
        <DisplaySettingsDialog
          displaySettings={displaySettings}
          onDisplaySettingsChange={setDisplaySettings}
          onSaveAsDefault={onSaveAsDefault}
          isSavingDisplayDefault={isSavingDisplayDefault}
          canSaveDisplayDefault={canSaveDisplayDefault}
          highlightSettings={highlightSettings}
          onHighlightSettingsChange={setHighlightSettings}
          highlightSaveEnabled={highlightSaveEnabled}
          onHighlightSaveEnabledChange={setHighlightSaveEnabled}
          canSaveHighlight={canSaveHighlight}
          numRows={pattern.numRows}
          numTablets={pattern.numTablets}
        />
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        {/* Ab 'lg' (Desktop): Anzeigeoptionen wieder als dauerhafte Seitenspalte statt Overlay. */}
        <div className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-6">
          <DisplaySettingsCard
            settings={displaySettings}
            onChange={setDisplaySettings}
            onSaveAsDefault={onSaveAsDefault}
            isSavingDefault={isSavingDisplayDefault}
            canSaveAsDefault={canSaveDisplayDefault}
          />
          <PatternHighlightSettingsCard
            settings={highlightSettings}
            onChange={setHighlightSettings}
            saveEnabled={highlightSaveEnabled}
            onSaveEnabledChange={setHighlightSaveEnabled}
            canSave={canSaveHighlight}
            numRows={pattern.numRows}
            numTablets={pattern.numTablets}
          />
        </div>

        <PatternDiagrams
          pattern={pattern}
          palette={activePalette}
          highlightSettings={highlightSettings}
          onHighlightSettingsChange={setHighlightSettings}
        />

        <div className="flex w-full flex-col gap-6 lg:w-56 lg:shrink-0">
          <PatternColorCard pattern={pattern} palette={activePalette} onSlotColorChange={setSlotColor} onReset={resetColors} />
          {/* Ab 'lg' (Desktop): Infos wieder unter den Farben statt unter dem Titel. */}
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}
