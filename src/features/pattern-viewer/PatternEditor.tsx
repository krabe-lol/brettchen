import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { CountControl } from './CountControl'
import { DisplaySettingsCard } from './DisplaySettingsCard'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'
import { PatternColorEditorCard } from './PatternColorEditorCard'
import { PatternDiagrams } from './PatternDiagrams'
import { PatternInfoSection } from './PatternInfoSection'
import { useDisplaySettings, useSaveDisplaySettingsAsDefault } from './DisplaySettingsContext'
import { isTwistNeutral } from './render/twist'
import { usePatternEditor } from './usePatternEditor'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { collectStyleTags, fetchPublishedPatterns } from '@/lib/strapi/patterns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Pattern } from './types'
import { LoaderCircle, Trash } from 'lucide-react'

/**
 * Entfernt Palette-Einträge, die kein Loch mehr referenziert – wird nur beim
 * Speichern angewendet, nicht während des Bearbeitens. Die Schussfadenfarbe
 * (weftColorSlotId) gilt dabei immer als benutzt, auch ohne Referenz durch
 * ein Loch der Schärung.
 */
function pruneUnusedColors(pattern: Pattern): Pattern {
  const usedSlotIds = new Set(pattern.threading.flatMap((tablet) => tablet.holes.map((hole) => hole.colorSlotId)))
  if (pattern.weftColorSlotId) usedSlotIds.add(pattern.weftColorSlotId)
  return { ...pattern, defaultPalette: pattern.defaultPalette.filter((slot) => usedSlotIds.has(slot.slotId)) }
}

interface PatternEditorProps {
  initialPattern: Pattern
  /** Seitenüberschrift; steht in derselben Zeile wie der Speichern-Button. */
  heading: string
  /** Wenn gesetzt, erscheinen der Öffentlich/Privat-Schalter und der Speichern-Button, die das aktuelle Muster übergeben. */
  onSave?: (pattern: Pattern, status: 'draft' | 'published') => void
  /** Wenn gesetzt, erscheint zusätzlich ein "Speichern & Schließen"-Button, der nach dem Speichern in den View-Modus wechselt. */
  onSaveAndClose?: (pattern: Pattern, status: 'draft' | 'published') => void
  /** Deaktiviert die Speichern-Buttons und zeigt einen Ladehinweis, während onSave/onSaveAndClose läuft. */
  isSaving?: boolean
  /** Wenn gesetzt, erscheint ein "Löschen"-Button (nur für bereits existierende Muster, nicht bei der Neuanlage). */
  onDelete?: () => void
  /** Deaktiviert den Löschen-Button und zeigt einen Ladehinweis, während onDelete läuft. */
  isDeleting?: boolean
  /**
   * Nur für bereits existierende Muster gesetzt (nicht bei der Neuanlage):
   * zeigt den aktuellen Sichtbarkeitsstatus neben der Überschrift, ändert
   * den Speichern-Button zu "Änderungen speichern" und ist der Startwert
   * des Öffentlich/Privat-Schalters.
   */
  moderationStatus?: 'draft' | 'published'
}

/**
 * Bearbeitbare Muster-Ansicht: Überschrift + Speichern-Buttons in einer
 * Kopfzeile, darunter Struktur-Einstellungen (Brettchen/Reihen), Schär- und
 * Drehmuster, Farbwahl sowie Musterinfos (Titel/Stil/Freitext bearbeitbar)
 * als vier Spalten. Eine Farbe wird in der Farbspalte als aktive Malfarbe
 * ausgewählt und dann in der Schärpatrone auf Zellen angewendet.
 */
export function PatternEditor({
  initialPattern,
  heading,
  onSave,
  onSaveAndClose,
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
    moveTablet,
    removeTabletAt,
    toggleOrientation,
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

  /**
   * Entfernt ungenutzte Farben lokal (damit `pattern` danach zum
   * gespeicherten Stand passt und "Änderungen speichern" korrekt wieder
   * deaktiviert wird) – ohne den lokalen Abgleich würde die entfernte Farbe
   * erst nach einem Neuladen der Seite verschwinden, siehe `initialPattern`
   * in `usePatternEditor`, das nur beim Mount übernommen wird.
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

  function saveAndCloseWithPrunedColors(status: 'draft' | 'published') {
    onSaveAndClose?.(pruneAndSyncColors(), status)
  }

  /**
   * Bei einem bereits existierenden Muster ("Änderungen speichern") gibt es
   * nichts zu tun, solange weder der Musterinhalt noch die Sichtbarkeit vom
   * zuletzt geladenen/gespeicherten Stand abweichen – `initialPattern`
   * spiegelt nach einem erfolgreichen Save automatisch den neuen Stand
   * wider (siehe PatternDetailPage.handleSave), der Vergleich bleibt also
   * auch nach dem Speichern korrekt. Bei einem neuen, noch nicht
   * gespeicherten Muster ("Muster speichern") gibt es keinen gespeicherten
   * Stand, mit dem verglichen werden könnte – dort immer aktiv.
   */
  const hasUnsavedChanges =
    moderationStatus === undefined ||
    JSON.stringify(pattern) !== JSON.stringify(initialPattern) ||
    visibility !== (moderationStatus === 'published' ? 'published' : 'draft')

  /**
   * Warnt beim Verlassen, solange es an einem bereits existierenden Muster
   * ungespeicherte Änderungen gibt (nicht bei der Neuanlage – dort ist
   * `hasUnsavedChanges` immer true, auch ohne jede Eingabe, siehe oben).
   * Zwei Fälle: `beforeunload` für Tab schließen/neu laden/URL eingeben
   * (Browser zeigt dafür immer seinen eigenen, nicht anpassbaren Text),
   * `useBlocker` für Navigation innerhalb der App (React-Router-Links).
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
        <div className="flex shrink-0 flex-wrap items-center gap-4">
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
              {onSaveAndClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveAndCloseWithPrunedColors(visibility)}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? t('editorSaving') : t('editorSaveAndClose')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unter 'lg' (Tablet/Handy): Infos direkt unter dem Titel. Ab 'lg' (Desktop): stattdessen unter den Farben, siehe unten. */}
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
          styleSuggestions={styleSuggestions}
          editable
          onTitleChange={setTitle}
          onStyleChange={setStyle}
          onNotesChange={setNotes}
          onSourceUrlChange={setSourceUrl}
        />
      </div>

      {/* Unter 'lg' (Tablet/Handy): Anzeigeoptionen hinter Button+Overlay, siehe DisplaySettingsDialog. */}
      <div className="mt-4 lg:hidden">
        <DisplaySettingsDialog
          displaySettings={displaySettings}
          onDisplaySettingsChange={setDisplaySettings}
          onSaveAsDefault={onSaveDisplaySettingsAsDefault}
          isSavingDisplayDefault={isSavingDisplayDefault}
          canSaveDisplayDefault={canSaveDisplayDefault}
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

          {/* Ab 'lg' (Desktop): Anzeigeoptionen wieder als dauerhafte Seitenspalte statt Overlay. */}
          <div className="hidden lg:block">
            <DisplaySettingsCard
              settings={displaySettings}
              onChange={setDisplaySettings}
              onSaveAsDefault={onSaveDisplaySettingsAsDefault}
              isSavingDefault={isSavingDisplayDefault}
              canSaveAsDefault={canSaveDisplayDefault}
            />
          </div>
        </div>

        <PatternDiagrams
          pattern={pattern}
          palette={palette}
          onThreadingCellClick={
            effectiveActiveSlotId
              ? (tabletIndex, holeIndex) => paintHole(tabletIndex, holeIndex, effectiveActiveSlotId)
              : undefined
          }
          onOrientationClick={toggleOrientation}
          onMoveTablet={moveTablet}
          onRemoveTablet={removeTabletAt}
          onWeaveCellClick={invertTurnsFrom}
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
          {/* Ab 'lg' (Desktop): Infos wieder unter den Farben statt unter dem Titel. */}
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
