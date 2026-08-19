import type { Difficulty } from './difficulty'
import type { TranslationKey } from '@/features/i18n/translations'

const KEY_BY_DIFFICULTY: Record<Difficulty, TranslationKey> = {
  easy: 'difficultyEasy',
  medium: 'difficultyMedium',
  hard: 'difficultyHard',
}

/** Translated label for a difficulty tier - shared by the thumbnail badge, pattern info, and filter bar. */
export function difficultyLabel(t: (key: TranslationKey) => string, difficulty: Difficulty): string {
  return t(KEY_BY_DIFFICULTY[difficulty])
}
