import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { ThreadingDiagram } from './ThreadingDiagram'
import { TabletOrientationLegend } from './TabletOrientationLegend'
import { WeaveDiagram } from './WeaveDiagram'
import { WeftColorSelector } from './WeftColorSelector'
import { WovenBandDiagram } from './WovenBandDiagram'
import { useDisplaySettings } from './DisplaySettingsContext'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DEFAULT_PATTERN_HIGHLIGHT_SETTINGS, type PatternHighlightSettings } from '@/lib/strapi/patternPreferences'
import type { Pattern, PaletteSlot } from './types'

interface PatternDiagramsProps {
  pattern: Pattern
  palette: PaletteSlot[]
  /** Wenn gesetzt, werden die Zellen in der Schärpatrone klickbar (Farbe anwenden). */
  onThreadingCellClick?: (tabletIndex: number, holeIndex: number) => void
  /** Wenn gesetzt, wird die S/Z-Kartenstellung unter jedem Brettchen klickbar. */
  onOrientationClick?: (tabletIndex: number) => void
  /** Wenn gesetzt, lässt sich ein Brettchen in der Schärpatrone per Drag & Drop verschieben. */
  onMoveTablet?: (fromIndex: number, toIndex: number) => void
  /** Wenn gesetzt, erscheint unter jeder Spalte der Schärpatrone ein kleines "×" zum Löschen genau dieses Brettchens. */
  onRemoveTablet?: (tabletIndex: number) => void
  /** Wenn gesetzt, werden die Zellen im Drehmuster klickbar (Drehrichtung ändern) – gilt nur für die Drehmuster-Ansicht, nicht fürs Webmuster. */
  onWeaveCellClick?: (rowIndex: number, tabletIndex: number) => void
  /** Wenn gesetzt, lässt sich die Schussfadenfarbe auswählen (siehe WeftColorSelector) – ohne wird nur der aktuelle Wert angezeigt. */
  onWeftColorChange?: (slotId: string | null) => void
  /** Reihen-/Brettchen-Hervorhebung + Untwist-Modus, siehe PatternHighlightSettingsCard/usePatternHighlightSettings – ohne diese Props bleiben Hervorhebung/Untwist aus (z. B. Muster-Vorschau auf der Einstellungsseite). */
  highlightSettings?: PatternHighlightSettings
  onHighlightSettingsChange?: (settings: PatternHighlightSettings) => void
}

type WeaveView = 'turning' | 'band'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Schärpatrone und Drehmuster/Webmuster, unverpackt (kein Rahmen, keine
 * Card). Jedes teilt sich per `flex-1` den verfügbaren Platz mit dem
 * anderen – die Diagramme selbst bleiben aber in ihrer natürlichen
 * Zellgröße, werden also nicht auf die Spaltenbreite hochskaliert. Rechts
 * lässt sich per ToggleGroup zwischen dem editierbaren Drehmuster (Ellipsen,
 * anklickbar) und einer rein lesenden, gewebt wirkenden Bandvorschau
 * umschalten – beide liegen an derselben Stelle.
 *
 * Reihen-/Brettchen-Hervorhebung + Untwist-Modus (siehe
 * PatternHighlightSettingsCard, `highlightSettings`/`onHighlightSettingsChange`
 * – anders als die übrigen Anzeigeoptionen pro Muster UND Nutzer:in
 * gespeichert, nicht global): zwei vollständig unabhängige Cursor mit
 * eigenem Schalter und eigener Zahleneingabe – die aktive Reihe
 * (hervorgehoben im Drehmuster/Band) und das aktive Brettchen (hervorgehoben
 * als Spalte im Schärmuster). Beide lassen sich zusätzlich per Pfeiltasten
 * verschieben (Hoch/Runter für die Reihe, Links/Rechts fürs Brettchen) –
 * das ist rein optional, da beide auch direkt in der Card eingegeben werden
 * können. Auf Mobilgeräten zusätzlich ein Floating-Steuerkreuz unten
 * rechts, da dort keine Pfeiltasten zur Verfügung stehen; es zeigt nur die
 * Richtungen des jeweils aktivierten Cursors. Pfeiltasten werden ignoriert,
 * solange ein Eingabefeld fokussiert ist, damit normale Textnavigation
 * nicht gestört wird.
 */
export function PatternDiagrams({
  pattern,
  palette,
  onThreadingCellClick,
  onOrientationClick,
  onMoveTablet,
  onRemoveTablet,
  onWeaveCellClick,
  onWeftColorChange,
  highlightSettings = DEFAULT_PATTERN_HIGHLIGHT_SETTINGS,
  onHighlightSettingsChange,
}: PatternDiagramsProps) {
  const { t } = useLanguage()
  const [weaveView, setWeaveView] = useState<WeaveView>('turning')
  const { settings: displaySettings } = useDisplaySettings()

  function stepRow(delta: number) {
    onHighlightSettingsChange?.({
      ...highlightSettings,
      activeRow: clamp(highlightSettings.activeRow + delta, 1, pattern.numRows),
    })
  }

  function stepTablet(delta: number) {
    onHighlightSettingsChange?.({
      ...highlightSettings,
      activeTablet: clamp(highlightSettings.activeTablet + delta, 1, pattern.numTablets),
    })
  }

  useEffect(() => {
    if (!onHighlightSettingsChange) return
    if (!highlightSettings.highlightRow && !highlightSettings.highlightTablet) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      if (highlightSettings.highlightRow && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        stepRow(e.key === 'ArrowUp' ? 1 : -1)
      } else if (highlightSettings.highlightTablet && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        stepTablet(e.key === 'ArrowRight' ? 1 : -1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onHighlightSettingsChange,
    highlightSettings.highlightRow,
    highlightSettings.highlightTablet,
    highlightSettings.activeRow,
    highlightSettings.activeTablet,
    pattern.numRows,
    pattern.numTablets,
  ])

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <h3 className="flex h-8 items-center text-sm font-medium">{t('threadingSectionTitle')}</h3>
        <ThreadingDiagram
          pattern={pattern}
          palette={palette}
          onCellClick={onThreadingCellClick}
          onOrientationClick={onOrientationClick}
          onMoveTablet={onMoveTablet}
          onRemoveTablet={onRemoveTablet}
          displaySettings={displaySettings}
          activeTablet={highlightSettings.highlightTablet ? highlightSettings.activeTablet - 1 : null}
        />
        {onMoveTablet && <p className="text-xs text-muted-foreground">{t('threadingDragHint')}</p>}
        <div>
          <WeftColorSelector
            palette={palette}
            weftColorSlotId={pattern.weftColorSlotId}
            onChange={onWeftColorChange}
          />
        </div>
        <div>
          <TabletOrientationLegend />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <ToggleGroup
          type="single"
          spacing="none"
          value={weaveView}
          onValueChange={(value) => value && setWeaveView(value as WeaveView)}
        >
          <ToggleGroupItem value="turning">{t('weaveViewTurning')}</ToggleGroupItem>
          <ToggleGroupItem value="band">{t('weaveViewBand')}</ToggleGroupItem>
        </ToggleGroup>
        {weaveView === 'turning' ? (
          <WeaveDiagram
            pattern={pattern}
            palette={palette}
            onCellClick={highlightSettings.untwistMode ? undefined : onWeaveCellClick}
            displaySettings={displaySettings}
            activeRow={highlightSettings.highlightRow ? highlightSettings.activeRow - 1 : null}
            untwistMode={highlightSettings.untwistMode}
          />
        ) : (
          <WovenBandDiagram
            pattern={pattern}
            palette={palette}
            activeRow={highlightSettings.highlightRow ? highlightSettings.activeRow - 1 : null}
            untwistMode={highlightSettings.untwistMode}
            showCenterLine={displaySettings.showCenterLine}
          />
        )}
      </div>

      {(highlightSettings.highlightRow || highlightSettings.highlightTablet) && (
        <div className="fixed right-4 bottom-4 z-40 grid grid-cols-3 grid-rows-3 gap-1 sm:hidden">
          <div />
          {highlightSettings.highlightRow && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shadow-lg"
              aria-label={t('patternNavigationRowNext')}
              onClick={() => stepRow(1)}
            >
              <ChevronUp />
            </Button>
          )}
          <div />
          {highlightSettings.highlightTablet && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shadow-lg"
              aria-label={t('patternNavigationTabletPrev')}
              onClick={() => stepTablet(-1)}
            >
              <ChevronLeft />
            </Button>
          )}
          <div />
          {highlightSettings.highlightTablet && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shadow-lg"
              aria-label={t('patternNavigationTabletNext')}
              onClick={() => stepTablet(1)}
            >
              <ChevronRight />
            </Button>
          )}
          <div />
          {highlightSettings.highlightRow && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shadow-lg"
              aria-label={t('patternNavigationRowPrev')}
              onClick={() => stepRow(-1)}
            >
              <ChevronDown />
            </Button>
          )}
          <div />
        </div>
      )}
    </>
  )
}
