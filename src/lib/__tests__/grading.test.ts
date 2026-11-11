import { describe, expect, it } from 'vitest';
import { checkTyped, choiceRating, levenshtein, normalize, pickDistractors, sentenceRating } from '@/lib/grading';

describe('normalize', () => {
  it('lowercase + bỏ dấu câu + gộp khoảng trắng', () => {
    expect(normalize('  Hello,   World! ')).toBe('hello world');
  });
  it('giữ dấu nhét trong từ (đúng chính tả Anh)', () => {
    expect(normalize("Don't")).toBe("don't");
  });
});

describe('levenshtein', () => {
  it('khoảng cách cơ bản', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });
});

describe('checkTyped — chế độ gõ từ', () => {
  it('đúng + nhanh (<8s) = Easy(4)', () => {
    expect(checkTyped('Negotiate', 'negotiate', 4000)).toBe(4);
  });
  it('đúng + chậm = Good(3)', () => {
    expect(checkTyped('negotiate', 'negotiate', 20000)).toBe(3);
  });
  it('sai chính tả nhỏ trong ngưỡng 20% = Hard(2)', () => {
    expect(checkTyped('negotiate', 'negotiate'.replace('t', 'g'), 5000)).toBe(2);
  });
  it('sai hoàn toàn = Again(1)', () => {
    expect(checkTyped('negotiate', 'banana', 5000)).toBe(1);
  });
  it('bỏ trống = Again(1)', () => {
    expect(checkTyped('negotiate', '   ')).toBe(1);
  });
  it('bỏ qua hoa thường & dấu câu', () => {
    expect(checkTyped('Workload', 'work-load.', 6000)).toBeGreaterThanOrEqual(3);
  });
});

describe('choiceRating', () => {
  it('đúng = Good, sai = Again (không Easy vì đoán được)', () => {
    expect(choiceRating(true)).toBe(3);
    expect(choiceRating(false)).toBe(1);
  });
});

describe('sentenceRating — điểm AI 0-10', () => {
  it('biên đúng kế hoạch: <4=1, 4-6=2, 7-8=3, 9-10=4', () => {
    expect(sentenceRating(0)).toBe(1);
    expect(sentenceRating(3)).toBe(1);
    expect(sentenceRating(4)).toBe(2);
    expect(sentenceRating(6)).toBe(2);
    expect(sentenceRating(7)).toBe(3);
    expect(sentenceRating(8)).toBe(3);
    expect(sentenceRating(9)).toBe(4);
    expect(sentenceRating(10)).toBe(4);
  });
});

describe('pickDistractors — trắc nghiệm', () => {
  const pool = [
    { word: 'deadline', meaning_vi: 'hạn chót', topic: 'Work', pos: 'n' },
    { word: 'budget', meaning_vi: 'ngân sách', topic: 'Money', pos: 'n' },
    { word: 'negotiate', meaning_vi: 'đàm phán', topic: 'Work', pos: 'v' },
    { word: 'visa', meaning_vi: 'thị thực', topic: 'Travel', pos: 'n' },
    { word: 'symptom', meaning_vi: 'triệu chứng', topic: 'Health', pos: 'n' },
  ];
  it('3 nhiễu, ưu tiên cùng chủ đề, không trùng đáp án', () => {
    const target = pool[0];
    const distractors = pickDistractors(target, pool);
    expect(distractors).toHaveLength(3);
    expect(distractors).not.toContain(target.meaning_vi);
    // cùng chủ đề Work phải vào trước
    expect(distractors[0]).toBe('đàm phán');
  });
  it('pool quá nhỏ vẫn không crash', () => {
    expect(pickDistractors(pool[0], [pool[0]]).length).toBeLessThanOrEqual(3);
  });
});
