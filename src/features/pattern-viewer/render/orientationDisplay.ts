import type { TabletOrientation } from '../types'

export type OrientationNotation = 'letters' | 'slashes'
export type OrientationMeaning = 'tablet' | 'thread'
export type HoleLabelDirection = 'clockwise' | 'counterclockwise'
export type HoleLabelFacing = 'left' | 'right'
export type HoleLabelNotation = 'letters' | 'hovu' | 'numbers'
export type WeaveCellShape = 'ellipse' | 'square'

/**
 * Rein anzeigeseitige Einstellungen für die Schärpatrone – ändern nie den
 * gespeicherten Wert. Referenz-Standard beim Speichern bleibt immer: S/Z
 * als Kartenstellung, Beschriftung im Uhrzeigersinn, nach links zeigend
 * (siehe DEFAULT_DISPLAY_SETTINGS, entspricht dem gespeicherten Wert 1:1).
 */
export interface DisplaySettings {
  orientationNotation: OrientationNotation
  orientationMeaning: OrientationMeaning
  holeLabelDirection: HoleLabelDirection
  holeLabelFacing: HoleLabelFacing
  /** Beschriftungsschema für die vier Löcher – A-D (Standard), HO/HU/VU/VO (hinten/vorne × oben/unten) oder 1-4. Dieselbe Reihenfolge wie A,B,C,D, siehe HOVU_BY_LETTER/NUMBER_BY_LETTER. */
  holeLabelNotation: HoleLabelNotation
  weaveCellShape: WeaveCellShape
  /** Deckkraft (0–100) der Vordergrundfarbe als Rückwärts-Hintergrund im Drehmuster – steuert den Kontrast zu vorwärts drehenden Zellen. */
  backwardContrast: number
  /** Blendet eine senkrechte Linie in der Brettchen-Mitte von Schärmuster, Drehmuster und Band ein – Hilfslinie, um Symmetrie zu prüfen. */
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
 * Zeigt die gespeicherte Kartenstellung an – je nach Einstellung als
 * S/Z-Buchstabe oder als Diagonale (\/), bezogen auf das Brettchen selbst
 * (gespeicherter Wert unverändert) oder den daraus resultierenden
 * Fadenzwirn (konventionell invertiert: Z-Schären ergibt S-Zwirn und
 * umgekehrt).
 */
export function displayOrientation(orientation: TabletOrientation, settings: DisplaySettings): string {
  const value = settings.orientationMeaning === 'thread' ? INVERTED_ORIENTATION[orientation] : orientation
  return settings.orientationNotation === 'slashes' ? SLASH_BY_ORIENTATION[value] : value
}

/**
 * Kombiniert `orientationNotation` und `orientationMeaning` zu einer
 * einzigen Auswahl für die Anzeigeeinstellungen: \/ gibt es nur für
 * Kartenstellung (keine \/-Schärung-Option), S/Z gibt es für beide
 * Bedeutungen.
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
 * Referenz-Reihenfolge (Index = physisches Loch wie im Datenmodell, 0 = A),
 * entspricht dem gespeicherten Wert unverändert, da Loch 0/A ganz unten und
 * Loch 3/D ganz oben gezeichnet wird. Die Reihen-Positionen ändern sich nie
 * (siehe ThreadingDiagram) – nur die hier zugeordnete Beschriftung.
 */
const BASE_ORDER = ['A', 'B', 'C', 'D']

/**
 * Sowohl "gegen den Uhrzeigersinn" als auch "nach rechts zeigend" vertauschen
 * jeweils nur B und D (A und C bleiben immer an Ort und Stelle) – zwei an
 * derselben Karte physisch unabhängige Spiegelungen (Umlaufrichtung bzw.
 * Blickseite), die sich bei gemeinsamer Anwendung wieder aufheben.
 */
const SWAP_B_D: Record<string, string> = { B: 'D', D: 'B' }

/**
 * Alternative Beschriftungen zu A/B/C/D, jeweils in derselben Reihenfolge:
 * HO/HU/VU/VO (hinten-oben, hinten-unten, vorne-unten, vorne-oben) oder 1-4.
 * Wird erst NACH Umlaufrichtung/Ausrichtung angewendet (siehe
 * displayHoleLetter) – ersetzt also nur das Symbol, nicht die Zuordnung.
 */
const HOVU_BY_LETTER: Record<string, string> = { A: 'HO', B: 'HU', C: 'VU', D: 'VO' }
const NUMBER_BY_LETTER: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' }

/** Ersetzt einen A/B/C/D-Buchstaben durch das gewählte Beschriftungsschema (siehe HOVU_BY_LETTER/NUMBER_BY_LETTER) – ohne Bezug zu Umlaufrichtung/Ausrichtung, für Stellen, die die A-D-Zuordnung bereits anderweitig bestimmen (z. B. die Blickseite in den Kartenstellungs-Grafiken in TabletOrientationLegend, die über eine gespiegelte Zeichnung statt per Textvertauschung abgebildet wird). */
export function applyHoleLabelNotation(letter: string, notation: HoleLabelNotation): string {
  if (notation === 'hovu') return HOVU_BY_LETTER[letter] ?? letter
  if (notation === 'numbers') return NUMBER_BY_LETTER[letter] ?? letter
  return letter
}

/**
 * Vertauscht B und D bei Gegen-Uhrzeigersinn (siehe SWAP_B_D) – für HO/HU/VU/VO
 * gibt es keine Umlaufrichtung (feste physische Positionen), daher bleibt der
 * Buchstabe dabei unverändert (siehe auch DisplaySettingsCard, wo die
 * Richtungs-Auswahl in diesem Fall auf Uhrzeigersinn fixiert und deaktiviert
 * ist). Eigenständig exportiert, damit z. B. TabletOrientationLegend die
 * Umlaufrichtung auf die Kartenstellungs-Grafiken anwenden kann, ohne auch
 * die dort bereits über die gespiegelte Zeichnung abgebildete Ausrichtung
 * (Blickseite) erneut zu vertauschen (siehe applyHoleLabelNotation).
 */
export function applyHoleLabelDirection(letter: string, direction: HoleLabelDirection, notation: HoleLabelNotation): string {
  if (notation === 'hovu' || direction !== 'counterclockwise') return letter
  return SWAP_B_D[letter] ?? letter
}

/**
 * Ordnet einem physischen Loch (Index wie im Datenmodell, 0 = A) die
 * anzuzeigende Beschriftung zu. Drei unabhängige, rein anzeigeseitige
 * Freiheitsgrade, die sich kombinieren: die Umlaufrichtung (siehe
 * applyHoleLabelDirection), ob die Beschriftung nach links oder rechts zeigt
 * (vertauscht ebenfalls B und D, hebt sich mit der Umlaufrichtung bei
 * gemeinsamer Anwendung wieder auf; für HO/HU/VU/VO ebenfalls ohne Wirkung
 * auf den Buchstaben), und das Beschriftungsschema (siehe
 * applyHoleLabelNotation).
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
