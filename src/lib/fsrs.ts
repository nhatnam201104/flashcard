// Wrapper ts-fsrs: đổi trạng thái thẻ Postgres ↔ card ts-fsrs, tính lịch mới.
// App tính FSRS phía client rồi gửi trạng thái mới cho submit_review kiểm chứng.
import {
  createEmptyCard,
  fsrs as buildFsrs,
  generatorParameters,
  type Card,
  type Grade,
} from 'ts-fsrs';
import type { CardStatePayload } from '@/types/db';

export interface NewCardState {
  due: string; // ISO
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
}

export function emptyCardState(): CardStatePayload {
  const c = createEmptyCard(new Date());
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as number,
    last_review: null,
  };
}

function toFsrsCard(s: CardStatePayload): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as Card['state'],
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

/** Tính trạng thái thẻ mới sau khi chấm `rating` (1..4). */
export function schedule(payload: CardStatePayload, rating: 1 | 2 | 3 | 4, desiredRetention = 0.9): NewCardState {
  const f = buildFsrs(
    generatorParameters({ request_retention: desiredRetention, enable_fuzz: true }),
  );
  const result = f.repeat(toFsrsCard(payload), new Date())[rating as Grade];
  const next = result.card;
  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state as number,
  };
}

/** Ngày tới khi ôn lại (cho UI đếm ngược). */
export function humanizeDue(dueIso: string): string {
  const ms = new Date(dueIso).getTime() - Date.now();
  if (ms <= 0) return 'đến hạn';
  const days = ms / 86_400_000;
  if (days < 1) {
    const h = Math.max(1, Math.round(days * 24));
    return `sau ${h} giờ`;
  }
  return `sau ${Math.round(days)} ngày`;
}
