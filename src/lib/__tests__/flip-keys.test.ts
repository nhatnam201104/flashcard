import { describe, expect, it } from 'vitest';
import { resolveFlipKey, type FlipKeyEvent } from '../flip-keys';

function key(overrides: Partial<FlipKeyEvent>): FlipKeyEvent {
  return { code: '', key: '', repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...overrides };
}

const FRONT = { flipped: false, disabled: false };
const BACK = { flipped: true, disabled: false };

describe('resolveFlipKey', () => {
  it('flips the card on Space or Enter when showing the front', () => {
    expect(resolveFlipKey(key({ code: 'Space', key: ' ' }), FRONT)).toEqual({ type: 'flip' });
    expect(resolveFlipKey(key({ code: 'Enter', key: 'Enter' }), FRONT)).toEqual({ type: 'flip' });
  });

  it('does not flip again when already showing the back', () => {
    expect(resolveFlipKey(key({ code: 'Space', key: ' ' }), BACK)).toBeNull();
  });

  it('grades with keys 1-4 when showing the back', () => {
    expect(resolveFlipKey(key({ code: 'Digit1', key: '1' }), BACK)).toEqual({ type: 'grade', rating: 1 });
    expect(resolveFlipKey(key({ code: 'Digit4', key: '4' }), BACK)).toEqual({ type: 'grade', rating: 4 });
  });

  it('ignores grade keys while the front is showing', () => {
    expect(resolveFlipKey(key({ code: 'Digit3', key: '3' }), FRONT)).toBeNull();
  });

  it('ignores grade keys while disabled (review in flight)', () => {
    expect(resolveFlipKey(key({ code: 'Digit3', key: '3' }), { flipped: true, disabled: true })).toBeNull();
  });

  it('ignores auto-repeat events from a held key', () => {
    expect(resolveFlipKey(key({ code: 'Digit3', key: '3', repeat: true }), BACK)).toBeNull();
    expect(resolveFlipKey(key({ code: 'Space', key: ' ', repeat: true }), FRONT)).toBeNull();
  });

  it('ignores keys combined with Ctrl, Alt or Meta (e.g. tab switching)', () => {
    expect(resolveFlipKey(key({ code: 'Digit1', key: '1', ctrlKey: true }), BACK)).toBeNull();
    expect(resolveFlipKey(key({ code: 'Digit1', key: '1', altKey: true }), BACK)).toBeNull();
    expect(resolveFlipKey(key({ code: 'Digit1', key: '1', metaKey: true }), BACK)).toBeNull();
  });

  it('ignores unrelated keys', () => {
    expect(resolveFlipKey(key({ code: 'Digit5', key: '5' }), BACK)).toBeNull();
    expect(resolveFlipKey(key({ code: 'KeyA', key: 'a' }), FRONT)).toBeNull();
  });
});
