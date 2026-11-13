import { describe, expect, it } from 'vitest';
import { gradeForKey, isFlipKey, type FlipKeyEvent } from '../flip-keys';

function key(overrides: Partial<FlipKeyEvent>): FlipKeyEvent {
  return { code: '', key: '', repeat: false, ctrlKey: false, altKey: false, metaKey: false, target: null, ...overrides };
}

const BUTTON = { tagName: 'BUTTON' } as unknown as EventTarget;
const LINK = { tagName: 'A' } as unknown as EventTarget;
const INPUT = { tagName: 'INPUT' } as unknown as EventTarget;
const EDITABLE = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;

describe('isFlipKey', () => {
  it('accepts Space, Enter and numpad Enter', () => {
    expect(isFlipKey(key({ code: 'Space', key: ' ' }))).toBe(true);
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter' }))).toBe(true);
    expect(isFlipKey(key({ code: 'NumpadEnter', key: 'Enter' }))).toBe(true);
  });

  it('ignores auto-repeat and Ctrl/Alt/Meta combinations', () => {
    expect(isFlipKey(key({ code: 'Space', key: ' ', repeat: true }))).toBe(false);
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter', ctrlKey: true }))).toBe(false);
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter', altKey: true }))).toBe(false);
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter', metaKey: true }))).toBe(false);
  });

  it('leaves Space/Enter to a focused button or link so it still activates natively', () => {
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter', target: BUTTON }))).toBe(false);
    expect(isFlipKey(key({ code: 'Space', key: ' ', target: LINK }))).toBe(false);
  });

  it('leaves Space/Enter to custom controls with an interactive ARIA role', () => {
    const roleButton = { tagName: 'DIV', getAttribute: (n: string) => (n === 'role' ? 'button' : null) };
    const roleTab = { tagName: 'SPAN', getAttribute: (n: string) => (n === 'role' ? 'tab' : null) };
    const plainDiv = { tagName: 'DIV', getAttribute: () => null };
    expect(isFlipKey(key({ code: 'Space', key: ' ', target: roleButton as unknown as EventTarget }))).toBe(false);
    expect(isFlipKey(key({ code: 'Enter', key: 'Enter', target: roleTab as unknown as EventTarget }))).toBe(false);
    expect(isFlipKey(key({ code: 'Space', key: ' ', target: plainDiv as unknown as EventTarget }))).toBe(true);
  });

  it('ignores keys while typing in a text field', () => {
    expect(isFlipKey(key({ code: 'Space', key: ' ', target: INPUT }))).toBe(false);
    expect(isFlipKey(key({ code: 'Space', key: ' ', target: EDITABLE }))).toBe(false);
  });

  it('ignores unrelated keys', () => {
    expect(isFlipKey(key({ code: 'KeyA', key: 'a' }))).toBe(false);
    expect(isFlipKey(key({ code: 'Digit1', key: '1' }))).toBe(false);
  });
});

describe('gradeForKey', () => {
  it('maps keys 1-4 to ratings', () => {
    expect(gradeForKey(key({ code: 'Digit1', key: '1' }))).toBe(1);
    expect(gradeForKey(key({ code: 'Numpad4', key: '4' }))).toBe(4);
  });

  it('ignores auto-repeat events from a held key', () => {
    expect(gradeForKey(key({ code: 'Digit3', key: '3', repeat: true }))).toBeNull();
  });

  it('ignores keys combined with Ctrl, Alt or Meta (e.g. tab switching)', () => {
    expect(gradeForKey(key({ code: 'Digit1', key: '1', ctrlKey: true }))).toBeNull();
    expect(gradeForKey(key({ code: 'Digit1', key: '1', altKey: true }))).toBeNull();
    expect(gradeForKey(key({ code: 'Digit1', key: '1', metaKey: true }))).toBeNull();
  });

  it('still grades while a button has focus', () => {
    expect(gradeForKey(key({ code: 'Digit2', key: '2', target: BUTTON }))).toBe(2);
  });

  it('ignores digits typed into a text field', () => {
    expect(gradeForKey(key({ code: 'Digit3', key: '3', target: INPUT }))).toBeNull();
  });

  it('ignores unrelated keys', () => {
    expect(gradeForKey(key({ code: 'Digit5', key: '5' }))).toBeNull();
    expect(gradeForKey(key({ code: 'Space', key: ' ' }))).toBeNull();
  });
});
