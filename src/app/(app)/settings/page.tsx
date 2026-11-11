'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSettings, saveSettings } from '@/lib/api';
import type { UserSettings } from '@/types/db';

export default function SettingsPage() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const [form, setForm] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
  }, [settings.data, form]);

  if (settings.isLoading) return <p className="pt-20 text-center text-muted-foreground">Đang tải…</p>;
  if (settings.isError || !form)
    return <p className="pt-20 text-center text-destructive">{(settings.error as Error)?.message ?? 'Lỗi'}</p>;

  const patch = (p: Partial<UserSettings>) => setForm((f) => (f ? { ...f, ...p } : f));
  const num = (k: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    patch({ [k]: Number(e.target.value) } as Partial<UserSettings>);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings({
        ai_provider: form.ai_provider,
        ai_model: form.ai_model,
        daily_new_limit: form.daily_new_limit,
        daily_review_limit: form.daily_review_limit,
        daily_ai_limit: form.daily_ai_limit,
        desired_retention: form.desired_retention,
        tts_voice: form.tts_voice,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <header>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">FSRS, giới hạn mỗi ngày, AI và giọng đọc</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Luyện tập</CardTitle>
          <CardDescription>Giới hạn mỗi ngày &amp; độ ghi nhớ mong muốn</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Thẻ mới / ngày</Label>
            <Input type="number" min={0} max={200} value={form.daily_new_limit} onChange={num('daily_new_limit')} />
          </div>
          <div className="space-y-1.5">
            <Label>Ôn lại / ngày</Label>
            <Input type="number" min={0} max={1000} value={form.daily_review_limit} onChange={num('daily_review_limit')} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Độ ghi nhớ mong muốn: <b>{Math.round(form.desired_retention * 100)}%</b></Label>
            <input
              type="range" min={0.7} max={0.99} step={0.01} value={form.desired_retention}
              onChange={num('desired_retention')}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">Cao hơn = ôn dày hơn, nhớ chắc hơn (0.85–0.92 hợp lý cho Aptis)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI chấm câu</CardTitle>
          <CardDescription>API key giữ trên server (Supabase secrets), không lưu trong app</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.ai_provider} onValueChange={(v) => patch({ ai_provider: v as UserSettings['ai_provider'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="none">Tắt AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model (tuỳ chọn)</Label>
              <Input value={form.ai_model ?? ''} onChange={(e) => patch({ ai_model: e.target.value })} placeholder="mặc định của provider" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Giới hạn lượt AI / ngày</Label>
            <Input type="number" min={0} max={1000} value={form.daily_ai_limit} onChange={num('daily_ai_limit')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phát âm (TTS)</CardTitle>
          <CardDescription>Aptis là kỳ thi Anh-Anh — khuyên dùng en-GB</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.tts_voice} onValueChange={(v) => patch({ tts_voice: v ?? 'en-GB' })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en-GB">en-GB (Anh-Anh)</SelectItem>
              <SelectItem value="en-US">en-US (Anh-Mỹ)</SelectItem>
              <SelectItem value="en-AU">en-AU (Anh-Úc)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu cài đặt'}</Button>
        {saved && <span className="text-sm text-emerald-500">Đã lưu ✓</span>}
      </div>
    </div>
  );
}
