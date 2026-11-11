'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkTyped } from '@/lib/grading';
import { speak } from '@/lib/tts';
import type { Rating, StudyQueueItem } from '@/types/db';

interface Props {
  card: StudyQueueItem;
  disabled: boolean;
  onGrade: (rating: Rating, extra?: { answer?: string; elapsedMs?: number }) => void;
}

const LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export function TypeMode({ card, disabled, onGrade }: Props) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState<{ rating: Rating; correct: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    setValue('');
    setChecked(null);
    startedAt.current = Date.now();
    inputRef.current?.focus();
  }, [card.card_id]);

  function submit() {
    if (checked || !value.trim()) return;
    const elapsed = Date.now() - startedAt.current;
    const rating = checkTyped(card.word, value, elapsed);
    setChecked({ rating, correct: rating >= 3 });
    speak(card.word);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Badge variant="outline" className="mb-2">{card.topic ?? '—'}</Badge>
        <p className="text-xs uppercase text-muted-foreground">Nghĩa tiếng Việt</p>
        <h2 className="mt-1 text-xl font-semibold">{card.meaning_vi ?? card.definition_en}</h2>
        {card.examples.length > 0 && (
          <p className="mt-3 text-sm italic text-muted-foreground">
            “{card.examples[0].replace(new RegExp(card.word, 'ig'), '_____')}”
          </p>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked) onGrade(checked.rating, { answer: value, elapsedMs: Date.now() - startedAt.current });
          else submit();
        }}
      >
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Gõ từ tiếng Anh…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={!!checked || disabled}
          className="text-lg"
        />
        {!checked ? (
          <Button type="submit" disabled={!value.trim()}>Kiểm tra</Button>
        ) : (
          <Button type="submit" disabled={disabled}>Tiếp →</Button>
        )}
      </form>

      {checked && (
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p className={checked.correct ? 'text-emerald-500' : 'text-red-500'}>
            {checked.rating >= 3 ? '✅ Chính xác!' : checked.rating === 2 ? '⚠️ Gần đúng (sai chính tả nhỏ)' : '❌ Chưa đúng'}
          </p>
          <p>
            Đáp án: <b className="text-base">{card.word}</b> {card.ipa && <span className="font-mono text-muted-foreground">· {card.ipa}</span>}
          </p>
          {card.definition_en && <p className="italic text-muted-foreground">{card.definition_en}</p>}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Chấm tự động: <b>{LABELS[checked.rating]}</b> — muốn đổi?</span>
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <Button key={r} size="sm" variant={r === checked.rating ? 'default' : 'outline'} onClick={() => setChecked({ ...checked, rating: r })}>
                {LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
