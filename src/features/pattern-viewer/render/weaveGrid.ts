import type { Pattern, TurnValue } from '../types';

export interface WeaveCell {
  tabletIndex: number;
  rowIndex: number;
  colorSlotId: string;
  turn: TurnValue;
  /**
   * Vorzeichen der tatsächlichen Bewegung durch die Lochfolge (Schären ×
   * Drehung): -1/+1, oder 0 bei Idle. Das ist das Ergebnis aus Kartenstellung
   * UND Drehbefehl zusammen – nicht dasselbe wie `turn` allein.
   */
  effectiveDirection: -1 | 0 | 1;
}

/**
 * Kehrt die Reihenfolge der Reihen um und invertiert jede Drehung – für den
 * "Untwist"-Anzeigemodus (siehe DisplaySettings.untwistMode): zeigt das
 * Muster so, wie es beim rückwärtigen Weben zum Entdrillen abläuft (die
 * zuletzt gewebte Reihe zuerst, jede Drehung in die Gegenrichtung). Rein
 * anzeigeseitig, ändert nie das gespeicherte Muster.
 */
export function applyUntwistOrder(pattern: Pattern): Pattern {
  return {
    ...pattern,
    turningSequence: [...pattern.turningSequence].reverse().map((row) => row.map((turn) => -turn)),
  };
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function sign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

/**
 * Berechnet pro Reihe und Brettchen, welche Schär-Farbe sichtbar ist.
 *
 * Reihe 1 ist ein Sonderfall: sie beginnt frisch an dem Lochfolge-Ende, das
 * zur Richtung der ersten Drehung passt – Loch A, wenn Reihe 1 vorwärts
 * gedreht wird, Loch D, wenn sie rückwärts gedreht wird.
 *
 * Ab Reihe 2 gilt: ein Richtungswechsel (diese Reihe dreht anders als die
 * vorherige) bedeutet, dass dieselbe Farbe wie in der vorherigen Reihe noch
 * einmal gedreht wird (die Karte "kehrt an derselben Stelle um"), und die
 * Lochfolge danach in der neuen Richtung weiterläuft. Ohne Richtungswechsel
 * läuft die Lochfolge einfach kontinuierlich in der bisherigen Richtung
 * weiter.
 *
 * Die Farbreihenfolge hängt dabei NICHT von `orientation` (S/Z) ab: bei
 * identischem Schären und identischer Drehfolge zeigen ein S- und ein
 * Z-ausgerichtetes Brettchen dieselbe Farbfolge. `orientation` beeinflusst
 * ausschließlich `effectiveDirection` – also nur, wie die Ellipse geneigt
 * gezeichnet wird, nicht welche Farbe sie zeigt.
 */
export function computeWeaveGrid(
  pattern: Pick<Pattern, 'threading' | 'turningSequence'>,
): WeaveCell[][] {
  const faceIndex = pattern.threading.map((tablet, tabletIndex) => {
    const holeCount = tablet.holes.length || 1;
    const firstTurn = pattern.turningSequence[0]?.[tabletIndex] ?? 0;
    return sign(firstTurn) < 0 ? holeCount - 1 : 0;
  });

  return pattern.turningSequence.map((row, rowIndex) =>
    row.map((turn, tabletIndex) => {
      const tablet = pattern.threading[tabletIndex];
      const holeCount = tablet.holes.length || 1;
      const colorSlotId = tablet.holes[faceIndex[tabletIndex]]?.colorSlotId ?? '';
      const direction = tablet.orientation === 'Z' ? 1 : -1;

      const nextTurn = pattern.turningSequence[rowIndex + 1]?.[tabletIndex];
      const isTurnaround = sign(turn) !== 0 && nextTurn !== undefined && sign(nextTurn) !== sign(turn);
      const appliedStep = isTurnaround ? 0 : turn;

      faceIndex[tabletIndex] = mod(faceIndex[tabletIndex] + appliedStep, holeCount);
      return { tabletIndex, rowIndex, colorSlotId, turn, effectiveDirection: sign(direction * turn) };
    }),
  );
}

/**
 * Wie `computeWeaveGrid`, aber mit Wiederholung, damit auch kurze Muster
 * eine Bandvorschau mit mindestens `minDisplayRows` Reihen füllen (siehe
 * WovenBandDiagram/PatternThumbnail). Ist `repeatFromRow` gesetzt (1-basiert),
 * erscheint der Teil davor ("Anfangsstück") einmal, danach wiederholt sich
 * nur die Einheit ab dieser Reihe; ohne `repeatFromRow` wiederholt sich das
 * gesamte Muster (kein Anfangsstück).
 *
 * Jede Wiederholung ist eine EXAKTE Kopie der einmal berechneten Zellen der
 * Einheit, nicht neu durchgerechnet: `computeWeaveGrid` führt die
 * Lochposition über die gesamte übergebene Folge fort – würde man die rohen
 * Drehwerte einfach aneinanderhängen und als eine große Folge neu
 * durchrechnen, würde die Lochposition von Wiederholung zu Wiederholung
 * langsam weiterdriften, sobald die Einheit selbst nicht twist-neutral ist,
 * und jede Kopie sähe anders aus statt identisch zu wiederholen.
 */
export function computeDisplayWeaveGrid(
  pattern: Pick<Pattern, 'threading' | 'turningSequence' | 'numRows' | 'repeatFromRow'>,
  minDisplayRows: number,
): WeaveCell[][] {
  const repeatStartIndex = pattern.repeatFromRow
    ? Math.min(Math.max(pattern.repeatFromRow - 1, 0), Math.max(pattern.numRows - 1, 0))
    : 0;
  const leadInRows = pattern.turningSequence.slice(0, repeatStartIndex);
  const repeatingUnit = pattern.turningSequence.slice(repeatStartIndex);
  const repeatCount =
    repeatingUnit.length > 0
      ? Math.max(1, Math.ceil((minDisplayRows - leadInRows.length) / repeatingUnit.length))
      : 1;

  const singlePassGrid = computeWeaveGrid({
    threading: pattern.threading,
    turningSequence: [...leadInRows, ...repeatingUnit],
  });
  const unitTemplate = singlePassGrid.slice(leadInRows.length);

  const weaveGrid: WeaveCell[][] = [...singlePassGrid];
  for (let copy = 1; copy < repeatCount; copy++) {
    const rowOffset = leadInRows.length + copy * repeatingUnit.length;
    unitTemplate.forEach((row, i) => {
      weaveGrid.push(row.map((cell) => ({ ...cell, rowIndex: rowOffset + i })));
    });
  }
  return weaveGrid;
}
