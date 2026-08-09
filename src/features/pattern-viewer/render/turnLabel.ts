import type { NomenclatureSet, TurnCategory, TurnValue } from '../types';

const HOLE_IDS = ['A', 'B', 'C', 'D'] as const;

export function turnCategory(turn: TurnValue): TurnCategory {
  if (turn > 0) return 'forward';
  if (turn < 0) return 'backward';
  return 'idle';
}

/** Formatiert eine Drehung gemäß der aktiven Nomenklatur, inkl. Mehrfachdrehungen. */
export function formatTurnLabel(nomenclature: NomenclatureSet, turn: TurnValue): string {
  const category = turnCategory(turn);
  const entry = nomenclature.turnLabels.find((l) => l.category === category);
  const symbol = entry?.symbol ?? '?';
  const magnitude = Math.abs(turn);

  if (category === 'idle' || magnitude <= 1) {
    return symbol;
  }

  switch (nomenclature.magnitudeDisplay) {
    case 'repeated_symbol':
      return symbol.repeat(magnitude);
    case 'suffix_number':
    case 'superscript':
    default:
      return `${symbol}${magnitude}`;
  }
}

/** Label für ein Loch (0-basierter Index) gemäß der aktiven Nomenklatur. */
export function holeLabelFor(nomenclature: NomenclatureSet, holeIndex: number): string {
  const holeId = HOLE_IDS[holeIndex];
  if (!holeId) return String(holeIndex + 1);
  return nomenclature.holeLabels.find((l) => l.holeId === holeId)?.label ?? holeId;
}
