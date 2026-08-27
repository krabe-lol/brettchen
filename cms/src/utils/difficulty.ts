export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Whether a tablet's turn direction ever flips across the rows - same
 * comparison as hasDirectionChange in the frontend (render/twist.ts).
 */
export function hasDirectionChange(turningSequence: number[][], tabletIndex: number): boolean {
  let previousSign: number | undefined;
  for (const row of turningSequence) {
    const sign = Math.sign(row[tabletIndex] ?? 0);
    if (previousSign !== undefined && sign !== previousSign) return true;
    previousSign = sign;
  }
  return false;
}

/** Tablet count's weight relative to a block, and the easy/medium and medium/hard score thresholds - see computeDifficulty in the frontend (render/difficulty.ts) for the full rationale. */
const TABLET_COUNT_WEIGHT = 1 / 4;
const EASY_SCORE_THRESHOLD = 4;
const HARD_SCORE_THRESHOLD = 10;

function reversalRows(turningSequence: number[][], tabletIndex: number): number[] {
  const rows: number[] = [];
  let previousSign: number | undefined;
  turningSequence.forEach((row, i) => {
    const sign = Math.sign(row[tabletIndex] ?? 0);
    if (previousSign !== undefined && sign !== previousSign) rows.push(i);
    previousSign = sign;
  });
  return rows;
}

function sameRows(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((row, i) => row === b[i]);
}

/**
 * Same computation as computeDifficulty in the frontend
 * (render/difficulty.ts) - see there for the full rationale. Kept in sync
 * by hand like computeIsTwistNeutral/hasDirectionChange in the pattern
 * controller.
 */
export function computeDifficulty(threading: any[] | undefined, turningSequence: number[][] | undefined): Difficulty {
  if (!turningSequence || turningSequence.length === 0 || !threading || threading.length === 0) return 'easy';

  const numTablets = threading.length;
  const patternTablets = Array.from({ length: numTablets }, (_, i) => i).filter((i) =>
    hasDirectionChange(turningSequence, i),
  );

  const isSynchronized =
    patternTablets.length === 0 ||
    (() => {
      const signatures = patternTablets.map((tabletIndex) => reversalRows(turningSequence, tabletIndex));
      return signatures.every((rows) => sameRows(rows, signatures[0]));
    })();

  const blockCounts = turningSequence.map((row) => {
    let blocks = 0;
    let previousSign: number | undefined;
    for (const tabletIndex of patternTablets) {
      const sign = Math.sign(row[tabletIndex] ?? 0);
      if (sign !== previousSign) blocks++;
      previousSign = sign;
    }
    return blocks;
  });
  const medianBlocks = [...blockCounts].sort((a, b) => a - b)[Math.floor(blockCounts.length / 2)] ?? 0;
  const score = medianBlocks + numTablets * TABLET_COUNT_WEIGHT;

  if (isSynchronized) return score <= EASY_SCORE_THRESHOLD ? 'easy' : 'medium';
  return score > HARD_SCORE_THRESHOLD ? 'hard' : 'medium';
}
