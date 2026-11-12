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

const FLIP_CODES = new Set(['Space', 'Enter', 'NumpadEnter']);
const GRADE_KEYS: Record<string, Rating> = { '1': 1, '2': 2, '3': 3, '4': 4 };
/** Elements where the user is typing: no shortcut may hijack their keys. */
const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Elements that Space/Enter activate natively. */
const ACTIVATABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);
/** Custom controls that handle Space/Enter themselves. */
const ACTIVATABLE_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option']);

interface ElementLike {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

function asElement(target: EventTarget | null): ElementLike {
  return (target ?? {}) as ElementLike;
}

function isActivatable(el: ElementLike): boolean {
  return ACTIVATABLE_TAGS.has(el.tagName ?? '') || ACTIVATABLE_ROLES.has(el.getAttribute?.('role') ?? '');
}

/** Held keys, modifier combos (Ctrl+1 = switch tab) and typing in a text field are never shortcuts. */
function isShortcutCandidate(e: FlipKeyEvent): boolean {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return false;
  const el = asElement(e.target);
  return el.isContentEditable !== true && !TEXT_ENTRY_TAGS.has(el.tagName ?? '');
}

/** Space / Enter flips the card, unless a focused button or link should receive it. */
export function isFlipKey(e: FlipKeyEvent): boolean {
  return isShortcutCandidate(e) && FLIP_CODES.has(e.code) && !isActivatable(asElement(e.target));
}

/** Keys 1-4 map to Again / Hard / Good / Easy. */
export function gradeForKey(e: FlipKeyEvent): Rating | null {
  return isShortcutCandidate(e) ? (GRADE_KEYS[e.key] ?? null) : null;
}
