'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { fetchCardPool, fetchStudyQueue, fetchTodayStats, type CardPoolItem } from '@/lib/api';
import { STUDY_MODES, type StudyMode } from '@/types/db';
import { StudySession } from '@/components/study/StudySession';

/** Stable fallback so ChoiceMode doesn't reshuffle its options on every render while the pool loads. */
const EMPTY_POOL: CardPoolItem[] = [];
const MIN_CHOICE_POOL = 4;

export default function StudyPage() {
  const [mode, setMode] = useState<StudyMode>('flip');
  const [topic, setTopic] = useState<string>('all');
  const [running, setRunning] = useState(false);

  const pool = useQuery({ queryKey: ['card-pool'], queryFn: fetchCardPool });
  // Choice mode needs the answer plus 3 distractors, otherwise every card is a free "Good".
  const choicePoolReady = (pool.data?.length ?? 0) >= MIN_CHOICE_POOL;
  const stats = useQuery({ queryKey: ['today-stats'], queryFn: fetchTodayStats, refetchInterval: 30_000 });
  const queue = useQuery({
    queryKey: ['queue-preview', topic],
    queryFn: () => fetchStudyQueue(topic),
  });

  const topics = useMemo(() => {
    const set = new Set((pool.data ?? []).map((c) => c.topic).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [pool.data]);

  const queuePreview = queue.data ?? [];
  const previewForTopic = (t: string) =>
    t === 'all'
      ? queuePreview.length
      : queuePreview.filter((c) => c.topic === t).length;

  if (running) {
    return (
      <StudySession
        mode={mode}
        topic={topic}
        pool={pool.data ?? EMPTY_POOL}
        onExit={() => {
          setRunning(false);
          queue.refetch();
          stats.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ôn tập</h1>
        <p className="text-sm text-muted-foreground">
          Đến hạn: <b>{stats.data?.dueNow ?? '…'}</b> thẻ · Đã ôn hôm nay: <b>{stats.data?.reviewedToday ?? '…'}</b> lượt
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STUDY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === m.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <div className="text-xl">{m.icon}</div>
                <div className="mt-1 text-sm font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.hint}</div>
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Chủ đề</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTopic('all')}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  topic === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                Tất cả · {previewForTopic('all')}
              </button>
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    topic === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {t} · {previewForTopic(t)}
                </button>
              ))}
            </div>
          </div>

          {queue.isError && (
            <p className="text-sm text-destructive">Không tải được hàng đợi: {(queue.error as Error).message}</p>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Sẵn sàng ôn: <b className="text-foreground">{queuePreview.length}</b> thẻ</span>
            {queue.data && (
              <span className="flex gap-2">
                <Badge variant="secondary">{queuePreview.filter((c) => !c.is_new).length} đến hạn</Badge>
                <Badge variant="outline">{queuePreview.filter((c) => c.is_new).length} mới</Badge>
              </span>
            )}
          </div>
          <Progress value={Math.min(100, (queuePreview.length / 60) * 100)} className="h-1.5" />

          <Button className="w-full" size="lg" disabled={!queue.data || queuePreview.length === 0 || (mode === 'choice' && !choicePoolReady)} onClick={() => setRunning(true)}>
            Bắt đầu · {STUDY_MODES.find((m) => m.id === mode)?.label}
            {topic !== 'all' ? ` · ${topic}` : ' · tất cả'}
          </Button>
          {mode === 'choice' && !choicePoolReady && !pool.isLoading && (
            <p className="text-center text-xs text-muted-foreground">
              {pool.isError ? 'Không tải được bộ thẻ để tạo đáp án nhiễu.' : `Cần ít nhất ${MIN_CHOICE_POOL} thẻ để chơi trắc nghiệm.`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
