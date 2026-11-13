'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { invokeAiGrade, type AiGradeResult } from '@/lib/api';
import { sentenceRating } from '@/lib/grading';
import type { Rating, StudyQueueItem } from '@/types/db';

interface Props {
  card: StudyQueueItem;
  desiredRetention?: number;
  disabled: boolean;
  onGrade: (rating: Rating, extra?: { answer?: string; elapsedMs?: number }) => void;
}

const LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export function SentenceMode({ card, disabled, onGrade }: Props) {
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState<AiGradeResult | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [busyAi, setBusyAi] = useState(false);
  const [startedAt] = useState(() => Date.now());

  async function submitToAi() {
    if (!sentence.trim() || busyAi) return;
    setBusyAi(true);
    const r = await invokeAiGrade(card, sentence.trim());
    setResult(r);
    if (r.ok && typeof r.score === 'number') setRating(sentenceRating(r.score));
    setBusyAi(false);
  }

  const needsManual = result && (!result.ok || result.score == null);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <Badge variant="outline" className="mb-2">{card.topic ?? '—'}</Badge>
        <h2 className="text-2xl font-bold">{card.word}</h2>
        {card.meaning_vi && <p className="text-sm text-muted-foreground">{card.meaning_vi}</p>}
        {card.collocations.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Gợi ý collocation: {card.collocations.slice(0, 3).join(' · ')}</p>
        )}
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Đặt 1 câu với từ này</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sentence">Câu của bạn</Label>
        <Textarea
          id="sentence"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`I usually ${card.word.toLowerCase()}…`}
          rows={3}
          disabled={!!result || disabled || busyAi}
        />
        {!result && (
          <Button className="w-full" onClick={submitToAi} disabled={!sentence.trim() || busyAi || disabled}>
            {busyAi ? 'AI đang chấm…' : '✨ Gửi AI chấm'}
          </Button>
        )}
      </div>

      {result && result.ok && result.score != null && (
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Điểm AI: <b className="text-lg">{result.score}/10</b></span>
            <span className="text-xs text-muted-foreground">{result.provider} · {result.model}</span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-red-500">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          {result.corrected && (
            <p><span className="text-muted-foreground">Bản sửa: </span><b>{result.corrected}</b></p>
          )}
          {result.better_version && (
            <p><span className="text-muted-foreground">Nâng cao: </span><i>{result.better_version}</i></p>
          )}
          {result.explanation_vi && <p className="rounded-lg bg-muted p-2 text-xs">{result.explanation_vi}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-muted-foreground">Chấm: <b>{rating ? LABELS[rating] : ''}</b> — có thể đổi</span>
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <Button key={r} size="sm" variant={r === rating ? 'default' : 'outline'} onClick={() => setRating(r)}>
                {LABELS[r]}
              </Button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={rating == null || disabled}
            onClick={() => rating && onGrade(rating, { answer: sentence, elapsedMs: Date.now() - startedAt })}
          >
            Tiếp →
          </Button>
        </div>
      )}

      {needsManual && (
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p className="text-muted-foreground">
            {result.reason ? `AI chưa sẵn sàng (${result.reason}). ` : 'AI chưa trả được kết quả. '}
            Bạn tự chấm câu của mình:
          </p>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <Button key={r} size="sm" variant={r === rating ? 'default' : 'outline'} onClick={() => setRating(r)}>
                {LABELS[r]}
              </Button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={rating == null || disabled}
            onClick={() => rating && onGrade(rating, { answer: sentence, elapsedMs: Date.now() - startedAt })}
          >
            Tiếp →
          </Button>
        </div>
      )}
    </div>
  );
}
