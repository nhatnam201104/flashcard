'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { speak } from '@/lib/tts';
import type { Rating, StudyQueueItem } from '@/types/db';

interface Props {
  card: StudyQueueItem;
  disabled: boolean;
  onGrade: (rating: Rating) => void;
}

const RATINGS: { value: Rating; label: string; key: string; className: string }[] = [
  { value: 1, label: 'Again', key: '1', className: 'bg-red-500/90 hover:bg-red-500 text-white' },
  { value: 2, label: 'Hard', key: '2', className: 'bg-amber-500/90 hover:bg-amber-500 text-white' },
  { value: 3, label: 'Good', key: '3', className: 'bg-emerald-500/90 hover:bg-emerald-500 text-white' },
  { value: 4, label: 'Easy', key: '4', className: 'bg-sky-500/90 hover:bg-sky-500 text-white' },
];

export function FlipMode({ card, disabled, onGrade }: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [card.card_id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!flipped && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        onGrade(Number(e.key) as Rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onGrade]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.button
            key="front"
            type="button"
            initial={{ rotateY: -30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setFlipped(true)}
            className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm"
          >
            <Badge variant="outline">{card.pos ?? '—'}</Badge>
            <h2 className="text-4xl font-bold">{card.word}</h2>
            {card.ipa && <p className="font-mono text-muted-foreground">{card.ipa}</p>}
            <p className="text-xs text-muted-foreground">Chạm hoặc Space để lật thẻ</p>
          </motion.button>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: 30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl font-bold">{card.word}</h2>
              <button type="button" className="text-lg" aria-label="Phát âm" onClick={() => speak(card.word)}>
                🔊
              </button>
            </div>
            {card.ipa && <p className="font-mono text-sm text-muted-foreground">{card.ipa}</p>}
            {card.meaning_vi && <p className="text-lg">{card.meaning_vi}</p>}
            {card.definition_en && <p className="text-sm italic text-muted-foreground">{card.definition_en}</p>}
            {card.collocations.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Collocations</p>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {card.collocations.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            )}
            {card.examples.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Ví dụ</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {card.examples.map((ex) => (
                    <li key={ex} className="flex items-start gap-2">
                      <button type="button" className="text-xs" aria-label="Đọc câu" onClick={() => speak(ex)}>
                        🔊
                      </button>
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {card.synonyms.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Đồng nghĩa: {card.synonyms.join(', ')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <Button key={r.value} className={r.className} disabled={disabled} onClick={() => onGrade(r.value)}>
              {r.label}
              <span className="ml-1 opacity-60">{r.key}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
