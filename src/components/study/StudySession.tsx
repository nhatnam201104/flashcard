'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { fetchSettings, fetchStudyQueue, submitReview, type CardPoolItem } from '@/lib/api';
import { schedule } from '@/lib/fsrs';
import { stopSpeaking } from '@/lib/tts';
import type { Rating, StudyMode, StudyQueueItem } from '@/types/db';
import { FlipMode } from './FlipMode';
import { TypeMode } from './TypeMode';
import { ChoiceMode } from './ChoiceMode';
import { ListenMode } from './ListenMode';
import { SentenceMode } from './SentenceMode';

interface Props {
  mode: StudyMode;
  topic: string;
  pool: CardPoolItem[];
  onExit: () => void;
}

interface SessionResult {
  word: string;
  rating: Rating;
}

export function StudySession({ mode, topic, pool, onExit }: Props) {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ['session-queue', topic], queryFn: () => fetchStudyQueue(topic), staleTime: Infinity });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: Infinity });

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [nextDueLabel, setNextDueLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cards = useMemo(() => queue.data ?? [], [queue.data]);
  const card: StudyQueueItem | undefined = cards[idx];
  const done = queue.isSuccess && idx >= cards.length;

  useEffect(() => () => stopSpeaking(), []);

  const finish = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['queue-preview'] });
    onExit();
  }, [onExit, queryClient]);

  const handleGraded = useCallback(
    async (rating: Rating, extra?: { answer?: string; elapsedMs?: number }) => {
      if (!card || busy) return;
      setBusy(true);
      setError(null);
      try {
        const { nextDueLabel: label } = await submitReview(card, rating, mode, {
          answer: extra?.answer,
          elapsedMs: extra?.elapsedMs,
          desiredRetention: settings.data?.desired_retention,
        });
        setResults((r) => [...r, { word: card.word, rating }]);
        setNextDueLabel(label);
        setIdx((i) => i + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi gửi kết quả');
      } finally {
        setBusy(false);
      }
    },
    [busy, card, mode, settings.data],
  );

  if (queue.isLoading) return <p className="pt-20 text-center text-muted-foreground">Đang lấy hàng đợi…</p>;
  if (queue.isError)
    return (
      <div className="space-y-4 pt-20 text-center">
        <p className="text-destructive">{(queue.error as Error).message}</p>
        <Button variant="outline" onClick={onExit}>Quay lại</Button>
      </div>
    );

  if (done) {
    const count = (r: Rating) => results.filter((x) => x.rating === r).length;
    return (
      <div className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <h2 className="text-xl font-bold">Hoàn thành {results.length} thẻ!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Again {count(1)} · Hard {count(2)} · Good {count(3)} · Easy {count(4)}
          </p>
          {nextDueLabel && <p className="mt-1 text-sm text-muted-foreground">Thẻ cuối: ôn lại {nextDueLabel}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={finish}>Xong</Button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {idx + 1}/{cards.length} · {card.topic ?? '—'} · {card.is_new ? 'thẻ mới' : 'ôn lại'}
          </span>
          <div className="flex items-center gap-2">
            {nextDueLabel && <span className="text-primary">→ {nextDueLabel}</span>}
            <button type="button" className="underline-offset-2 hover:underline" onClick={finish}>
              Kết thúc
            </button>
          </div>
        </div>
        <Progress value={(idx / cards.length) * 100} className="h-1.5" />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 p-2 text-center text-sm text-destructive">{error}</p>}

      <div className="flex flex-1 flex-col">
        {mode === 'flip' && <FlipMode key={card.card_id} card={card} disabled={busy} onGrade={handleGraded} />}
        {mode === 'type' && (
          <TypeMode key={card.card_id} card={card} disabled={busy} onGrade={(r, extra) => handleGraded(r, extra)} />
        )}
        {mode === 'choice' && (
          <ChoiceMode key={card.card_id} card={card} pool={pool} disabled={busy} onGrade={(r) => handleGraded(r)} />
        )}
        {mode === 'listen' && (
          <ListenMode
            key={card.card_id}
            card={card}
            voice={settings.data?.tts_voice ?? 'en-GB'}
            disabled={busy}
            onGrade={(r, extra) => handleGraded(r, extra)}
          />
        )}
        {mode === 'sentence' && (
          <SentenceMode
            key={card.card_id}
            card={card}
            desiredRetention={settings.data?.desired_retention}
            disabled={busy}
            onGrade={(r, extra) => handleGraded(r, extra)}
          />
        )}
      </div>
    </div>
  );
}
