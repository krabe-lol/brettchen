import type { TabletOrientation } from '../types'

export type OrientationNotation = 'letters' | 'slashes'
export type OrientationMeaning = 'tablet' | 'thread'
export type HoleLabelDirection = 'clockwise' | 'counterclockwise'
export type HoleLabelFacing = 'left' | 'right'
export type HoleLabelNotation = 'letters' | 'hovu' | 'numbers'
export type WeaveCellShape = 'ellipse' | 'square'

/**
 * Purely display-side settings for the threading chart - never change the
 * stored value. The reference standard when saving is always: S/Z card
 * orientation, clockwise labeling, facing left (see DEFAULT_DISPLAY_SETTINGS,
 * which matches the stored value 1:1).
 */
export interface DisplaySettings {
  orientationNotation: OrientationNotation
  orientationMeaning: OrientationMeaning
  holeLabelDirection: HoleLabelDirection
  holeLabelFacing: HoleLabelFacing
  /** Labeling scheme for the four holes - A-D (default), HO/HU/VU/VO (back/front x top/bottom), or 1-4. Same order as A,B,C,D, see HOVU_BY_LETTER/NUMBER_BY_LETTER. */
  holeLabelNotation: HoleLabelNotation
  weaveCellShape: WeaveCellShape
  /** Opacity (0-100) of the foreground color as the backward-turn background in the turning diagram - controls contrast against forward-turning cells. */
  backwardContrast: number
  /** Shows a vertical line through the tablet centers in the threading chart, turning diagram and band - a guide to check symmetry. */
  showCenterLine: boolean
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  orientationNotation: 'letters',
  orientationMeaning: 'tablet',
  holeLabelDirection: 'clockwise',
  holeLabelFacing: 'left',
  holeLabelNotation: 'letters',
  weaveCellShape: 'ellipse',
  backwardContrast: 12,
  showCenterLine: false,
}

const SLASH_BY_ORIENTATION: Record<TabletOrientation, string> = { S: '\\', Z: '/' }

const INVERTED_ORIENTATION: Record<TabletOrientation, TabletOrientation> = { S: 'Z', Z: 'S' }

/**
 * Displays the stored card orientation - as an S/Z letter or a diagonal
 * (\/) depending on settings, relative to the tablet itself (stored value
 * unchanged) or the resulting thread twist (conventionally inverted: Z
 * threading produces S twist and vice versa).
 */
export function displayOrientation(orientation: TabletOrientation, settings: DisplaySettings): string {
  const value = settings.orientationMeaning === 'thread' ? INVERTED_ORIENTATION[orientation] : orientation
  return settings.orientationNotation === 'slashes' ? SLASH_BY_ORIENTATION[value] : value
}

/**
 * Combines `orientationNotation` and `orientationMeaning` into a single
 * choice for the display settings: \/ only exists for card orientation
 * (no \/-threading option), S/Z exists for both meanings.
 */
export type NotationChoice = 'sz-thread' | 'sz-tablet' | 'slash-tablet'

export function notationChoiceFor(settings: DisplaySettings): NotationChoice {
  if (settings.orientationNotation === 'slashes') return 'slash-tablet'
  return settings.orientationMeaning === 'thread' ? 'sz-thread' : 'sz-tablet'
}

export function applyNotationChoice(settings: DisplaySettings, choice: NotationChoice): DisplaySettings {
  if (choice === 'slash-tablet') {
    return { ...settings, orientationNotation: 'slashes', orientationMeaning: 'tablet' }
  }
  return { ...settings, orientationNotation: 'letters', orientationMeaning: choice === 'sz-thread' ? 'thread' : 'tablet' }
}

/**
 * Reference order (index = physical hole as in the data model, 0 = A),
 * matches the stored value unchanged since hole 0/A is drawn at the bottom
 * and hole 3/D at the top. Row positions never change (see
 * ThreadingDiagram) - only the label assigned here does.
 */
const BASE_ORDER = ['A', 'B', 'C', 'D']

/**
 * Both "counterclockwise" and "facing right" each swap only B and D (A and
 * C never move) - two physically independent mirrorings on the same card
 * (winding direction and viewing side) that cancel out when applied together.
 */
const SWAP_B_D: Record<string, string> = { B: 'D', D: 'B' }

/**
 * Alternative labels for A/B/C/D, in the same order: HO/HU/VU/VO
 * (back-top, back-bottom, front-bottom, front-top) or 1-4. Applied AFTER
 * winding direction/facing (see displayHoleLetter) - so it only swaps the
 * symbol, not the assignment.
 */
const HOVU_BY_LETTER: Record<string, string> = { A: 'HO', B: 'HU', C: 'VU', D: 'VO' }
const NUMBER_BY_LETTER: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' }

/** Replaces an A/B/C/D letter with the chosen labeling scheme (see HOVU_BY_LETTER/NUMBER_BY_LETTER) - independent of winding direction/facing, for places that already determine the A-D assignment another way (e.g. the viewing side in the card-orientation graphics in TabletOrientationLegend, which uses a mirrored drawing instead of text swapping). */
export function applyHoleLabelNotation(letter: string, notation: HoleLabelNotation): string {
  if (notation === 'hovu') return HOVU_BY_LETTER[letter] ?? letter
  if (notation === 'numbers') return NUMBER_BY_LETTER[letter] ?? letter
  return letter
}

/**
 * Swaps B and D for counterclockwise (see SWAP_B_D) - HO/HU/VU/VO has no
 * winding direction (fixed physical positions), so the letter stays
 * unchanged there (see also DisplaySettingsCard, where the direction
 * choice is fixed to clockwise and disabled in that case). Exported on its
 * own so e.g. TabletOrientationLegend can apply winding direction to the
 * card-orientation graphics without also re-swapping the facing already
 * represented there via a mirrored drawing (see applyHoleLabelNotation).
 */
export function applyHoleLabelDirection(letter: string, direction: HoleLabelDirection, notation: HoleLabelNotation): string {
  if (notation === 'hovu' || direction !== 'counterclockwise') return letter
  return SWAP_B_D[letter] ?? letter
}

/**
 * Maps a physical hole (index as in the data model, 0 = A) to its display
 * label. Combines three independent, purely display-side degrees of
 * freedom: winding direction (see applyHoleLabelDirection), whether the
 * label faces left or right (also swaps B and D, cancels out with winding
 * direction when both are applied; no effect on HO/HU/VU/VO either), and
 * the labeling scheme (see applyHoleLabelNotation).
 */
export function displayHoleLetter(holeIndex: number, settings: DisplaySettings): string {
  const letter = BASE_ORDER[holeIndex] ?? String(holeIndex + 1)
  const directedLetter = applyHoleLabelDirection(letter, settings.holeLabelDirection, settings.holeLabelNotation)
  const facedLetter =
    settings.holeLabelNotation !== 'hovu' && settings.holeLabelFacing === 'right'
      ? (SWAP_B_D[directedLetter] ?? directedLetter)
      : directedLetter
  return applyHoleLabelNotation(facedLetter, settings.holeLabelNotation)
}
