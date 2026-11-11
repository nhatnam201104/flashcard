'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkTyped } from '@/lib/grading';
import { speak, stopSpeaking, ttsSupported } from '@/lib/tts';
import type { Rating, StudyQueueItem } from '@/types/db';

interface Props {
  card: StudyQueueItem;
  voice: string;
  disabled: boolean;
  onGrade: (rating: Rating, extra?: { answer?: string; elapsedMs?: number }) => void;
}

const LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

/** Nghe & chép: 50% nghe từ, 50% nghe cả câu ví dụ rồi gõ lại */
export function ListenMode({ card, voice, disabled, onGrade }: Props) {
  const fullSentence = card.examples.length > 0 && Math.random() < 0.5;
  const target = fullSentence ? card.examples[0] : card.word;

  const [value, setValue] = useState('');
  const [checked, setChecked] = useState<{ rating: Rating; expected: string } | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setValue('');
    setChecked(null);
    startedAt.current = Date.now();
    const t = setTimeout(() => speak(target, voice), 350);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [card.card_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ttsSupported()) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
        Trình duyệt không hỗ trợ TTS — hãy dùng chế độ khác.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 shadow-sm">
        <button
          type="button"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground transition-transform active:scale-95"
          aria-label="Phát lại"
          onClick={() => speak(target, voice)}
        >
          🔊
        </button>
        <p className="text-xs text-muted-foreground">
          {fullSentence ? 'Nghe câu ví dụ và gõ lại nguyên văn' : 'Nghe từ và gõ lại từ đó'}
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked) onGrade(checked.rating, { answer: value, elapsedMs: Date.now() - startedAt.current });
          else if (value.trim()) {
            setChecked({ rating: checkTyped(target, value), expected: target });
          }
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={fullSentence ? 'Gõ câu bạn nghe được…' : 'Gõ từ bạn nghe được…'}
          autoComplete="off"
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
          <p className={checked.rating >= 3 ? 'text-emerald-500' : checked.rating === 2 ? 'text-amber-500' : 'text-red-500'}>
            {checked.rating >= 3 ? '✅ Chính xác!' : checked.rating === 2 ? '⚠️ Gần đúng' : '❌ Chưa đúng'}
          </p>
          <p>
            Đáp án: <b>{checked.expected}</b>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Tự chấm: <b>{LABELS[checked.rating]}</b> — muốn đổi?</span>
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
