'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { pickDistractors } from '@/lib/grading';
import { speak } from '@/lib/tts';
import type { Rating, StudyQueueItem } from '@/types/db';
import type { CardPoolItem } from '@/lib/api';

interface Props {
  card: StudyQueueItem;
  pool: CardPoolItem[];
  disabled: boolean;
  onGrade: (rating: Rating) => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** How long the right/wrong feedback stays on screen before the grade is sent. */
const FEEDBACK_MS = 1100;

export function ChoiceMode({ card, pool, disabled, onGrade }: Props) {
  const correct = card.meaning_vi ?? card.definition_en ?? card.word;
  const options = useMemo(() => shuffle([correct, ...pickDistractors(card, pool)]), [card, correct, pool]);

  const [picked, setPicked] = useState<string | null>(null);
  // Set once the grade has been sent. Rendered with key={card.card_id}, so a successful
  // grade remounts us; if we are still here and not busy, the submit failed.
  const [sent, setSent] = useState(false);
  const rating: Rating = picked === correct ? 3 : 1;

  useEffect(() => {
    speak(card.word);
  }, [card.word]);

  useEffect(() => {
    if (picked == null) return;
    const t = setTimeout(() => {
      setSent(true);
      onGrade(rating);
    }, FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps -- fire once per pick

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Badge variant="outline" className="mb-2">{card.topic ?? '—'}</Badge>
        <h2 className="text-3xl font-bold">{card.word}</h2>
        {card.ipa && <p className="font-mono text-sm text-muted-foreground">{card.ipa}</p>}
        <button type="button" className="mt-2 text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => speak(card.word)}>
          🔊 Nghe lại
        </button>
      </div>

      <div className="grid gap-2">
        {options.map((opt) => {
          const isCorrect = opt === correct;
          const state = picked == null ? '' : isCorrect ? 'correct' : opt === picked ? 'wrong' : 'dim';
          return (
            <button
              key={opt}
              type="button"
              disabled={picked != null || disabled}
              onClick={() => setPicked(opt)}
              className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                state === 'correct'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : state === 'wrong'
                    ? 'border-red-500 bg-red-500/10'
                    : state === 'dim'
                      ? 'opacity-50'
                      : 'hover:bg-accent'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked != null && (
        <p className={`text-center text-sm ${picked === correct ? 'text-emerald-500' : 'text-red-500'}`}>
          {picked === correct ? '✅ Đúng — Good' : `❌ Sai — Again · đáp án: ${correct}`}
        </p>
      )}

      {sent && !disabled && (
        <Button variant="outline" onClick={() => onGrade(rating)}>
          Gửi lại
        </Button>
      )}
    </div>
  );
}
