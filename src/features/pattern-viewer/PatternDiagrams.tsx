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
  /** If set, cells in the threading chart become clickable (apply color). */
  onThreadingCellClick?: (tabletIndex: number, holeIndex: number) => void
  /** If set, the S/Z card orientation below each tablet becomes clickable. */
  onOrientationClick?: (tabletIndex: number) => void
  /** If set, a tablet can be dragged to move it in the threading chart. */
  onMoveTablet?: (fromIndex: number, toIndex: number) => void
  /** If set, a small "x" appears below each threading chart column to delete that tablet. */
  onRemoveTablet?: (tabletIndex: number) => void
  /** If set, cells in the turning diagram become clickable (change turn direction) - only applies to the turning view, not the woven band. */
  onWeaveCellClick?: (rowIndex: number, tabletIndex: number) => void
  /** If set, a button at the end of each row inverts every tablet's turn from that row up - only applies to the turning view, not the woven band. */
  onInvertRow?: (rowIndex: number) => void
  /** If set, a row can be dragged to move it in the turning diagram - only applies to the turning view, not the woven band. */
  onMoveRow?: (fromIndex: number, toIndex: number) => void
  /** If set, a tablet's twist counter becomes clickable to exclude/re-include it from the twist-neutrality check - only applies to the turning view, not the woven band. */
  onToggleTwistExempt?: (tabletIndex: number) => void
  /** If set, the weft color can be picked (see WeftColorSelector) - without it, only the current value is shown. */
  onWeftColorChange?: (slotId: string | null) => void
  /** Row/tablet highlighting + untwist mode, see PatternHighlightSettingsCard/usePatternHighlightSettings - without these props, highlighting/untwist stays off (e.g. the pattern preview on the settings page). */
  highlightSettings?: PatternHighlightSettings
  onHighlightSettingsChange?: (settings: PatternHighlightSettings) => void
}

type WeaveView = 'turning' | 'band'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Threading chart and turning/woven diagram, unwrapped (no border, no
 * card). Each shares the available space with the other via `flex-1` -
 * but the diagrams themselves stay at their natural cell size, they're
 * never scaled up to the column width. On the right, a ToggleGroup
 * switches between the editable turning diagram (ellipses, clickable) and
 * a read-only, woven-look band preview - both occupy the same spot.
 *
 * Row/tablet highlighting + untwist mode (see PatternHighlightSettingsCard,
 * `highlightSettings`/`onHighlightSettingsChange` - saved per pattern AND
 * user unlike the other display options, not globally): two fully
 * independent cursors with their own toggle and number input - the active
 * row (highlighted in the turning diagram/band) and the active tablet
 * (highlighted as a column in the threading chart). Both can also be
 * moved with arrow keys (up/down for the row, left/right for the tablet) -
 * purely optional, since both can also be typed directly into the card.
 * On mobile, an additional floating button row in the bottom right, since
 * arrow keys aren't available there (tablet left/right first, then row
 * up/down); it only shows the directions of whichever cursor is active.
 * Arrow keys are ignored while an input field is focused, so normal text
 * navigation isn't disrupted.
 */
export function PatternDiagrams({
  pattern,
  palette,
  onThreadingCellClick,
  onOrientationClick,
  onMoveTablet,
  onRemoveTablet,
  onWeaveCellClick,
  onInvertRow,
  onMoveRow,
  onToggleTwistExempt,
  onWeftColorChange,
  highlightSettings = DEFAULT_PATTERN_HIGHLIGHT_SETTINGS,
  onHighlightSettingsChange,
}: PatternDiagramsProps) {
  const { t } = useLanguage()
  const [weaveView, setWeaveView] = useState<WeaveView>('turning')
  const { settings: displaySettings } = useDisplaySettings()

  /**
   * Stepping past the last (topmost, see rowY in WeaveDiagram) row wraps
   * back down to the repeat row instead of stopping - that's where weaving
   * actually continues for a repeating pattern. Stepping below row 1 just
   * clamps, since there's nothing to wrap to there.
   */
  function stepRow(delta: number) {
    const next = highlightSettings.activeRow + delta
    const activeRow =
      next > pattern.numRows ? clamp(pattern.repeatFromRow ?? 1, 1, pattern.numRows) : clamp(next, 1, pattern.numRows)
    onHighlightSettingsChange?.({ ...highlightSettings, activeRow })
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
            onInvertRow={highlightSettings.untwistMode ? undefined : onInvertRow}
            onMoveRow={highlightSettings.untwistMode ? undefined : onMoveRow}
            onToggleTwistExempt={highlightSettings.untwistMode ? undefined : onToggleTwistExempt}
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
        <div className="fixed right-4 bottom-4 z-40 flex gap-1 sm:hidden">
          {highlightSettings.highlightTablet && (
            <>
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
            </>
          )}
          {highlightSettings.highlightRow && (
            <>
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
            </>
          )}
        </div>
      )}
    </>
  )
}
