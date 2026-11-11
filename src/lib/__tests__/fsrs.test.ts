import { describe, expect, it } from 'vitest';
import { emptyCardState, humanizeDue, schedule } from '@/lib/fsrs';

describe('emptyCardState', () => {
  it('thẻ mới: state=0, reps=0, stability=0', () => {
    const s = emptyCardState();
    expect(s.state).toBe(0);
    expect(s.reps).toBe(0);
    expect(s.stability).toBe(0);
    expect(s.last_review).toBeNull();
  });
});

describe('schedule — luồng submit thật', () => {
  it('thẻ mới chấm Again: qua Learning, due trong tương lai gần', () => {
    const ns = schedule(emptyCardState(), 1);
    expect(ns.reps).toBe(1);
    expect(new Date(ns.due).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(ns.due).getTime()).toBeLessThan(Date.now() + 60 * 60 * 1000); // <1h
  });

  it('thẻ mới chấm Good: qua Learning (bước ngắn ~10 phút) theo đúng FSRS', () => {
    const ns = schedule(emptyCardState(), 3);
    expect(ns.state).toBe(1); // Learning — tốt nghiệp sang Review ở lần review kế tiếp
    expect(new Date(ns.due).getTime()).toBeLessThan(Date.now() + 60 * 60 * 1000);
  });

  it('thẻ Review chấm Good: vẫn Review, due xa hơn', () => {
    const start = {
      ...emptyCardState(),
      state: 2, reps: 3, stability: 5, difficulty: 5,
      due: new Date(Date.now() - 86_400_000).toISOString(),
      last_review: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const ns = schedule(start, 3);
    expect(ns.state).toBe(2);
    const days = (new Date(ns.due).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(1);
  });

  it('Easy cho due xa hơn Good (cùng trạng thái xuất phát)', () => {
    const start = {
      ...emptyCardState(),
      state: 2, reps: 3, stability: 5, difficulty: 5,
      due: new Date(Date.now() - 86_400_000).toISOString(),
      last_review: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const good = schedule(start, 3);
    const easy = schedule(start, 4);
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(good.due).getTime());
  });

  it('Again làm tăng lapses; difficulty nằm trong 1..10', () => {
    const start = {
      ...emptyCardState(),
      state: 2, reps: 3, stability: 5, difficulty: 5,
      due: new Date(Date.now() - 86_400_000).toISOString(),
      last_review: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const again = schedule(start, 1);
    expect(again.lapses).toBe(start.lapses + 1);
    expect(again.difficulty).toBeGreaterThanOrEqual(1);
    expect(again.difficulty).toBeLessThanOrEqual(10);
  });

  it('giá trị đủ hợp lệ để submit_review chấp nhận (due < 365 ngày)', () => {
    const ns = schedule(emptyCardState(), 4);
    expect(ns.stability).toBeGreaterThanOrEqual(0);
    expect(ns.stability).toBeLessThanOrEqual(365);
    expect(new Date(ns.due).getTime()).toBeLessThan(Date.now() + 365 * 86_400_000);
  });
});

describe('humanizeDue', () => {
  it('hiển thị tiếng Việt dễ hiểu', () => {
    expect(humanizeDue(new Date(Date.now() - 1000).toISOString())).toBe('đến hạn');
    expect(humanizeDue(new Date(Date.now() + 3 * 86_400_000).toISOString())).toBe('sau 3 ngày');
  });
});
