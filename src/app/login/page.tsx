'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/study';
  const supabase = getSupabaseBrowserClient();

  const [devEmail, setDevEmail] = useState('nam@test.local');
  const [devPassword, setDevPassword] = useState('aptis2026');
  const [magicEmail, setMagicEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loginDev() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });
    setBusy(false);
    if (error) setMessage(`Lỗi: ${error.message}`);
    else router.replace(next);
  }

  async function sendMagicLink() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setMessage(`Lỗi: ${error.message}`);
    else setMessage('Đã gửi magic link — kiểm tra hộp thư (local: http://127.0.0.1:54324).');
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl">
            🃏
          </div>
          <CardTitle className="text-2xl">Aptis Flashcard</CardTitle>
          <CardDescription>Ôn từ vựng Aptis bằng FSRS — nhớ lâu, ôn đúng lúc</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dev">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dev">Đăng nhập</TabsTrigger>
              <TabsTrigger value="magic">Magic link</TabsTrigger>
            </TabsList>
            <TabsContent value="dev" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input id="password" type="password" value={devPassword} onChange={(e) => setDevPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={loginDev} disabled={busy}>
                {busy ? 'Đang vào...' : 'Vào app'}
              </Button>
            </TabsContent>
            <TabsContent value="magic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="ban@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                />
              </div>
              <Button className="w-full" variant="outline" onClick={sendMagicLink} disabled={busy || !magicEmail.trim()}>
                Gửi magic link
              </Button>
            </TabsContent>
          </Tabs>
          {message && <p className="mt-4 text-center text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
