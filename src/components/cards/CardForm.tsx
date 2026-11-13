'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { upsertCard } from '@/lib/api';
import { exampleToLine, lineToExample } from '@/lib/examples';
import type { CardRow } from '@/types/db';

interface Props {
  card: CardRow | null;
  topics: string[];
  onClose: () => void;
  onSaved: () => void;
}

const lines = (arr?: string[] | null) => (arr ?? []).join('\n');
const toLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function CardForm({ card, topics, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    word: '', ipa: '', pos: '', meaning_vi: '', definition_en: '',
    examples: '', collocations: '', synonyms: '', topic: '', level: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      word: card?.word ?? '',
      ipa: card?.ipa ?? '',
      pos: card?.pos ?? '',
      meaning_vi: card?.meaning_vi ?? '',
      definition_en: card?.definition_en ?? '',
      examples: (card?.examples ?? []).map(exampleToLine).join('\n'),
      collocations: lines(card?.collocations),
      synonyms: lines(card?.synonyms),
      topic: card?.topic ?? '',
      level: card?.level ?? '',
    });
  }, [card]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.word.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await upsertCard({
        id: card?.id,
        word: form.word,
        ipa: form.ipa,
        pos: form.pos,
        meaning_vi: form.meaning_vi,
        definition_en: form.definition_en,
        examples: toLines(form.examples).map(lineToExample),
        collocations: toLines(form.collocations),
        synonyms: toLines(form.synonyms),
        topic: form.topic,
        level: form.level,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu thẻ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? `Sửa: ${card.word}` : 'Thêm thẻ mới'}</DialogTitle>
          <DialogDescription>Mỗi ví dụ / collocation / đồng nghĩa một dòng.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Từ *</Label>
              <Input value={form.word} onChange={set('word')} placeholder="negotiate" />
            </div>
            <div className="space-y-1.5">
              <Label>IPA</Label>
              <Input value={form.ipa} onChange={set('ipa')} placeholder="/nɪˈɡəʊʃieɪt/" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại từ</Label>
              <Input value={form.pos} onChange={set('pos')} placeholder="v" />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Input value={form.level} onChange={set('level')} placeholder="B2" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nghĩa tiếng Việt</Label>
            <Input value={form.meaning_vi} onChange={set('meaning_vi')} placeholder="đàm phán" />
          </div>
          <div className="space-y-1.5">
            <Label>Định nghĩa tiếng Anh</Label>
            <Textarea value={form.definition_en} onChange={set('definition_en')} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Ví dụ</Label>
            <Textarea
              value={form.examples}
              onChange={set('examples')}
              rows={3}
              placeholder="Mỗi dòng một câu: câu tiếng Anh | bản dịch (tuỳ chọn)"
            />
            <p className="text-xs text-muted-foreground">Mỗi dòng một câu · dạng “câu tiếng Anh | bản dịch”.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Collocations</Label>
            <Textarea value={form.collocations} onChange={set('collocations')} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Đồng nghĩa</Label>
            <Textarea value={form.synonyms} onChange={set('synonyms')} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Chủ đề</Label>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {topics.slice(0, 12).map((t) => (
                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, topic: t }))}>
                  <Badge variant={form.topic === t ? 'default' : 'secondary'}>{t}</Badge>
                </button>
              ))}
            </div>
            <Input value={form.topic} onChange={set('topic')} placeholder="Work" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={busy || !form.word.trim()}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
