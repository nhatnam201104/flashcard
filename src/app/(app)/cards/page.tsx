'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchCards, fetchCardPool } from '@/lib/api';
import type { CardRow } from '@/types/db';
import { CardForm } from '@/components/cards/CardForm';

export default function CardsPage() {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');
  const [editing, setEditing] = useState<CardRow | 'new' | null>(null);
  const queryClient = useQueryClient();

  const pool = useQuery({ queryKey: ['card-pool'], queryFn: fetchCardPool });
  const cards = useQuery({
    queryKey: ['cards', search, topic, level],
    queryFn: () => fetchCards({ search, topic, level }),
  });

  const topics = useMemo(() => {
    const set = new Set((pool.data ?? []).map((c) => c.topic).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [pool.data]);

  // Tránh đọc thời gian hiện tại trong render-phase (Next 16 prerender)
  const [today, setToday] = useState('');
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thẻ từ</h1>
          <p className="text-sm text-muted-foreground">{cards.data?.length ?? '…'} thẻ</p>
        </div>
        <Button onClick={() => setEditing('new')}>+ Thêm</Button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Tìm từ hoặc nghĩa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:flex-1"
        />
        <Select value={topic} onValueChange={(v) => setTopic(v ?? 'all')}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi chủ đề</SelectItem>
            {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => setLevel(v ?? 'all')}>
          <SelectTrigger className="sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi level</SelectItem>
            {['B1', 'B2', 'C1'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {cards.isError && <p className="text-sm text-destructive">{(cards.error as Error).message}</p>}

      <div className="space-y-2">
        {(cards.data ?? []).map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setEditing(card)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{card.word}</span>
                {card.level && <Badge variant="outline" className="shrink-0">{card.level}</Badge>}
                {card.next_review <= today && <span className="text-xs text-primary">đến hạn</span>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{card.meaning_vi ?? card.definition_en ?? '—'}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {card.topic && <Badge variant="secondary">{card.topic}</Badge>}
              <span className="text-xs text-muted-foreground">rep {card.stage}</span>
            </div>
          </button>
        ))}
        {cards.isSuccess && cards.data.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Không có thẻ nào khớp bộ lọc.</p>
        )}
      </div>

      {editing && (
        <CardForm
          card={editing === 'new' ? null : editing}
          topics={topics}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['cards'] });
            void queryClient.invalidateQueries({ queryKey: ['card-pool'] });
          }}
        />
      )}
    </div>
  );
}
