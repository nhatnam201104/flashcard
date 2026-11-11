// Quy đổi kết quả từng chế độ ôn về điểm FSRS 1..4 (Again..Easy)
import type { Rating } from '@/types/db';

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()–—]/g, ' ')
    .replace(/[\-‐‑–—]/g, '') // gộp từ ghép: work-load → workload
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Chấm chế độ gõ từ / nghe chép:
 *  sai = Again(1); đúng + sai chính tả nhỏ hoặc chậm = Hard(2);
 *  đúng = Good(3); đúng và nhanh (<8s) = Easy(4)
 */
export function checkTyped(expected: string, given: string, elapsedMs?: number | null): Rating {
  const e = normalize(expected);
  const g = normalize(given);
  if (!g) return 1;
  if (e === g) return elapsedMs != null && elapsedMs > 0 && elapsedMs < 8000 ? 4 : 3;
  const tolerance = Math.max(1, Math.floor(e.length * 0.2));
  if (levenshtein(e, g) <= tolerance) return 2;
  return 1;
}

/** Trắc nghiệm dễ đoán trúng nên không cho Easy: đúng = Good, sai = Again. */
export function choiceRating(correct: boolean): Rating {
  return correct ? 3 : 1;
}

/** Điểm AI 0–10 → FSRS: <4 Again, 4–6 Hard, 7–8 Good, 9–10 Easy. */
export function sentenceRating(score: number): Rating {
  if (score < 4) return 1;
  if (score <= 6) return 2;
  if (score <= 8) return 3;
  return 4;
}

/** Lấy 3 đáp án nhiễu: ưu tiên cùng chủ đề, rồi cùng loại từ, rồi ngẫu nhiên. */
export function pickDistractors(
  target: { word: string; meaning_vi: string | null; topic: string | null; pos: string | null },
  pool: { word: string; meaning_vi: string | null; topic: string | null; pos: string | null }[],
): string[] {
  const others = pool.filter((c) => c.word !== target.word);
  const sameTopic = others.filter((c) => c.topic && c.topic === target.topic);
  const samePos = others.filter((c) => !sameTopic.includes(c) && c.pos && c.pos === target.pos);
  const filler = others.filter((c) => !sameTopic.includes(c) && !samePos.includes(c));
  const shuffled = (arr: typeof others) => arr.sort(() => Math.random() - 0.5);
  return [...shuffled(sameTopic), ...shuffled(samePos), ...shuffled(filler)]
    .slice(0, 3)
    .map((c) => c.meaning_vi || c.word);
}
