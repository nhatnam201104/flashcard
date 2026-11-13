import { describe, expect, test } from 'vitest';
import { safeNextPath, DEFAULT_AFTER_LOGIN } from '../paths';

describe('safeNextPath', () => {
  test('keeps an in-app absolute path', () => {
    expect(safeNextPath('/cards')).toBe('/cards');
  });

  test('keeps query string on an in-app path', () => {
    expect(safeNextPath('/study?mode=flip')).toBe('/study?mode=flip');
  });

  test('falls back when missing or empty', () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('')).toBe(DEFAULT_AFTER_LOGIN);
  });

  test('rejects protocol-relative URLs (open redirect)', () => {
    expect(safeNextPath('//evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/\\evil.com')).toBe(DEFAULT_AFTER_LOGIN);
  });

  test('rejects absolute external URLs', () => {
    expect(safeNextPath('https://evil.com/study')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('javascript:alert(1)')).toBe(DEFAULT_AFTER_LOGIN);
  });

  test('does not bounce back to login or auth callback', () => {
    expect(safeNextPath('/login')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/auth/callback')).toBe(DEFAULT_AFTER_LOGIN);
  });
});
