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

/** More than this many direction "blocks" at the median row pushes a pattern from medium to hard - see computeDifficulty in the frontend (render/difficulty.ts) for the full rationale. */
const HARD_BLOCK_THRESHOLD = 5;

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
  if (patternTablets.length === 0) return 'easy';

  const signatures = patternTablets.map((tabletIndex) => reversalRows(turningSequence, tabletIndex));
  if (signatures.every((rows) => sameRows(rows, signatures[0]))) return 'easy';

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
  const medianBlocks = [...blockCounts].sort((a, b) => a - b)[Math.floor(blockCounts.length / 2)];

  return medianBlocks > HARD_BLOCK_THRESHOLD ? 'hard' : 'medium';
}
