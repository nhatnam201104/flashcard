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

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devEmail, setDevEmail] = useState('nam@test.local');
  const [devPassword, setDevPassword] = useState('aptis2026');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /** Gửi email chứa mã 6 số (kèm magic link) */
  async function sendCode() {
    if (!email.trim()) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setMessage(`Lỗi: ${error.message}`);
    else {
      setCodeSent(true);
      setMessage('Đã gửi! Mở email lấy mã 6 số (hoặc bấm link trong email).');
    }
  }

  async function verifyCode() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) setMessage(`Mã chưa đúng hoặc đã hết hạn: ${error.message}`);
    else router.replace(next);
  }

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
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="dev">Dev</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 pt-4">
              {!codeSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email của bạn</Label>
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      placeholder="ban@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                    />
                  </div>
                  <Button className="w-full" onClick={sendCode} disabled={busy || !email.trim()}>
                    {busy ? 'Đang gửi…' : 'Nhận mã đăng nhập'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã 6 số gửi tới {email}</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="••••••"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verifyCode()}
                      className="text-center text-2xl tracking-[0.5em]"
                    />
                  </div>
                  <Button className="w-full" onClick={verifyCode} disabled={busy || code.length < 6}>
                    {busy ? 'Đang kiểm tra…' : 'Xác nhận'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => { setCodeSent(false); setCode(''); setMessage(null); }}
                  >
                    Đổi email / gửi lại
                  </button>
                </>
              )}
            </TabsContent>

            <TabsContent value="dev" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="dev-email">Email</Label>
                <Input id="dev-email" type="email" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input id="password" type="password" value={devPassword} onChange={(e) => setDevPassword(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Chỉ dùng với môi trường dev local (nam@test.local).</p>
              <Button className="w-full" variant="outline" onClick={loginDev} disabled={busy}>
                {busy ? 'Đang vào…' : 'Vào app'}
              </Button>
            </TabsContent>
          </Tabs>
          {message && <p className="mt-4 text-center text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
