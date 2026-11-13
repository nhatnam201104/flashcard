import { describe, expect, it } from 'vitest';
import { exampleToLine, lineToExample, normalizeExamples } from '../examples';

describe('normalizeExamples', () => {
  it('accepts the {en, vi} objects stored in the live database', () => {
    expect(normalizeExamples([{ en: 'She is prone to colds.', vi: 'Cô ấy dễ bị cảm.' }])).toEqual([
      { en: 'She is prone to colds.', vi: 'Cô ấy dễ bị cảm.' },
    ]);
  });

  it('accepts plain strings (seed data, older rows)', () => {
    expect(normalizeExamples(['Meet the deadline.'])).toEqual([{ en: 'Meet the deadline.', vi: null }]);
  });

  it('treats a missing or blank vi as null', () => {
    expect(normalizeExamples([{ en: 'Hi.' }, { en: 'Yo.', vi: '  ' }])).toEqual([
      { en: 'Hi.', vi: null },
      { en: 'Yo.', vi: null },
    ]);
  });

  it('drops malformed or empty entries instead of crashing the render', () => {
    expect(normalizeExamples([null, 42, {}, { vi: 'chỉ có tiếng Việt' }, '', '  ', { en: '' }, { en: 'Ok.' }])).toEqual([
      { en: 'Ok.', vi: null },
    ]);
  });

  it('returns [] for anything that is not an array', () => {
    expect(normalizeExamples(null)).toEqual([]);
    expect(normalizeExamples(undefined)).toEqual([]);
    expect(normalizeExamples({ en: 'x' })).toEqual([]);
  });
});

describe('exampleToLine / lineToExample (card edit form)', () => {
  it('round-trips an example with a translation', () => {
    const ex = { en: 'She is prone to colds.', vi: 'Cô ấy dễ bị cảm.' };
    expect(exampleToLine(ex)).toBe('She is prone to colds. | Cô ấy dễ bị cảm.');
    expect(lineToExample(exampleToLine(ex))).toEqual(ex);
  });

  it('round-trips an example without a translation', () => {
    expect(exampleToLine({ en: 'Hi.', vi: null })).toBe('Hi.');
    expect(lineToExample('Hi.')).toEqual({ en: 'Hi.', vi: null });
  });

  it('trims both halves of a typed line', () => {
    expect(lineToExample('  Hello there.  |  Xin chào.  ')).toEqual({ en: 'Hello there.', vi: 'Xin chào.' });
  });
});
