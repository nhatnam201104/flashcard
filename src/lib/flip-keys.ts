import type { Rating } from '@/types/db';

/** Subset of KeyboardEvent used to decide what a key press means in flip mode. */
export interface FlipKeyEvent {
  code: string;
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
}

export interface FlipKeyState {
  flipped: boolean;
  disabled: boolean;
}

export type FlipKeyAction = { type: 'flip' } | { type: 'grade'; rating: Rating };

const FLIP_CODES = new Set(['Space', 'Enter', 'NumpadEnter']);
const GRADE_KEYS: Record<string, Rating> = { '1': 1, '2': 2, '3': 3, '4': 4 };
/** Elements where the user is typing: no shortcut may hijack their keys. */
const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Elements that Space/Enter activate natively. */
const ACTIVATABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

interface ElementLike {
  tagName?: string;
  isContentEditable?: boolean;
}

function isTextEntry(target: EventTarget | null): boolean {
  const el = target as ElementLike | null;
  return !!el && (el.isContentEditable === true || TEXT_ENTRY_TAGS.has(el.tagName ?? ''));
}

function isActivatable(target: EventTarget | null): boolean {
  const el = target as ElementLike | null;
  return !!el && ACTIVATABLE_TAGS.has(el.tagName ?? '');
}

export function resolveFlipKey(e: FlipKeyEvent, { flipped, disabled }: FlipKeyState): FlipKeyAction | null {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || isTextEntry(e.target)) return null;

  if (!flipped) {
    // A focused button/link handles Space/Enter itself (incl. the card's own front face).
    return FLIP_CODES.has(e.code) && !isActivatable(e.target) ? { type: 'flip' } : null;
  }

  const rating = GRADE_KEYS[e.key];
  if (rating === undefined || disabled) return null;
  return { type: 'grade', rating };
}
