import type { Example } from '@/types/db';

/** Separator between the English sentence and its translation in the card edit form. */
const LINE_SEPARATOR = ' | ';

function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toExample(raw: unknown): Example | null {
  if (typeof raw === 'string') {
    const en = nonBlank(raw);
    return en ? { en, vi: null } : null;
  }
  if (raw && typeof raw === 'object') {
    const { en, vi } = raw as { en?: unknown; vi?: unknown };
    const text = nonBlank(en);
    return text ? { en: text, vi: nonBlank(vi) } : null;
  }
  return null;
}

/**
 * `cards.examples` is jsonb: live rows hold `{en, vi}` objects, seed/older rows hold plain
 * strings. Normalise at the API boundary so the UI only ever sees `Example[]`.
 */
export function normalizeExamples(raw: unknown): Example[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toExample).filter((ex): ex is Example => ex !== null);
}

export function exampleToLine(ex: Example): string {
  return ex.vi ? `${ex.en}${LINE_SEPARATOR}${ex.vi}` : ex.en;
}

export function lineToExample(line: string): Example {
  const [en, ...rest] = line.split(LINE_SEPARATOR.trim());
  return { en: en.trim(), vi: nonBlank(rest.join(LINE_SEPARATOR.trim())) };
}
