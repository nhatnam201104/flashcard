import type { Rating } from '@/types/db';

/** Subset of KeyboardEvent used to decide what a key press means in flip mode. */
export interface FlipKeyEvent {
  code: string;
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface FlipKeyState {
  flipped: boolean;
  disabled: boolean;
}

export type FlipKeyAction = { type: 'flip' } | { type: 'grade'; rating: Rating };

const FLIP_CODES = new Set(['Space', 'Enter']);
const GRADE_KEYS: Record<string, Rating> = { '1': 1, '2': 2, '3': 3, '4': 4 };

export function resolveFlipKey(e: FlipKeyEvent, { flipped, disabled }: FlipKeyState): FlipKeyAction | null {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return null;

  if (!flipped) {
    return FLIP_CODES.has(e.code) ? { type: 'flip' } : null;
  }

  const rating = GRADE_KEYS[e.key];
  if (rating === undefined || disabled) return null;
  return { type: 'grade', rating };
}
