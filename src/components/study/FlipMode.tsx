'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { isFlipKey } from '@/lib/flip-keys';
import type { Rating, StudyQueueItem } from '@/types/db';
import { FlipBack } from './FlipBack';
import { FLIP_MOTION_PROPS } from './flip-motion';

interface Props {
  card: StudyQueueItem;
  disabled: boolean;
  onGrade: (rating: Rating) => void;
}

/**
 * Flip-card study mode. Render with `key={card.card_id}` so every card starts
 * on its front face — `flipped` is never carried over from the previous card.
 */
export function FlipMode({ card, disabled, onGrade }: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (flipped) return;
    function onKey(e: KeyboardEvent) {
      if (!isFlipKey(e)) return;
      e.preventDefault();
      setFlipped(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped]);

  return (
    <div className="flex flex-1 flex-col">
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.button
            key="front"
            type="button"
            {...FLIP_MOTION_PROPS}
            onClick={() => setFlipped(true)}
            className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm"
          >
            <Badge variant="outline">{card.pos ?? '—'}</Badge>
            <h2 className="text-4xl font-bold">{card.word}</h2>
            {card.ipa && <p className="font-mono text-muted-foreground">{card.ipa}</p>}
            <p className="text-xs text-muted-foreground">Chạm hoặc Space để lật thẻ</p>
          </motion.button>
        ) : (
          <FlipBack key="back" card={card} disabled={disabled} onGrade={onGrade} />
        )}
      </AnimatePresence>
    </div>
  );
}
