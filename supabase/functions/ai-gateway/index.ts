// Supabase Edge Function: ai-gateway
// Giữ API key ở server, chấm câu đặt bằng AI (Claude / OpenAI / Gemini),
// validate JSON bằng Zod, retry 1 lần, fallback cho người dùng tự chấm.
// Deploy: supabase functions deploy ai-gateway
// Secrets: supabase secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'npm:zod';

const GradeSchema = z.object({
  score: z.number().min(0).max(10),
  errors: z.array(z.string()).default([]),
  corrected: z.string().default(''),
  better_version: z.string().default(''),
  explanation_vi: z.string().default(''),
});
type Grade = z.infer<typeof GradeSchema>;

const SYSTEM_PROMPT = `You are an English teacher grading ONE sentence written by a Vietnamese learner (target level B2-C1, Aptis exam).
Grade the sentence for grammar, collocation use with the given word, and naturalness.
- score: 0-10 (10 = flawless and natural, uses the target word correctly)
- errors: short list of mistakes (empty if none)
- corrected: minimal-correction version of the learner sentence
- better_version: a more natural/advanced B2-C1 version
- explanation_vi: 1-3 sentences in Vietnamese explaining the main points
Respond with ONLY a JSON object, no markdown.`;

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-haiku-latest',
  gemini: 'gemini-flash-latest',
};

const KEY_ENV: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

async function callProvider(
  provider: string,
  model: string,
  apiKey: string,
  userPrompt: string,
): Promise<string> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`claude ${res.status}`);
    const data = await res.json();
    return (data.content?.[0]?.text ?? '') as string;
  }

  // gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function scoreToRating(score: number): number {
  if (score < 4) return 1;
  if (score <= 6) return 2;
  if (score <= 8) return 3;
  return 4;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, reason: 'unauthorized' }, 401);

    const body = await req.json();
    if (body.action !== 'grade' || typeof body.sentence !== 'string' || !body.sentence.trim()) {
      return json({ ok: false, reason: 'invalid_request' }, 400);
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('ai_provider,ai_model,daily_ai_limit')
      .eq('user_id', user.id)
      .maybeSingle();

    // Giới hạn chi phí: đếm lượt AI đã dùng hôm nay
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from('sentence_attempts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today);
    const limit = settings?.daily_ai_limit ?? 50;
    if ((count ?? 0) >= limit) {
      return json({ ok: false, reason: `Đã hết ${limit} lượt AI hôm nay` }, 429);
    }

    const provider: string = body.provider ?? settings?.ai_provider ?? 'openai';
    if (provider === 'none') return json({ ok: false, reason: 'AI đang tắt trong Settings' }, 400);

    const keyEnv = KEY_ENV[provider];
    if (!keyEnv) return json({ ok: false, reason: `Không hỗ trợ provider "${provider}"` }, 400);
    const apiKey = Deno.env.get(keyEnv);
    if (!apiKey) return json({ ok: false, reason: `Chưa đặt ${keyEnv} (supabase secrets)` }, 500);

    const model: string = settings?.ai_model || body.model || DEFAULT_MODELS[provider];
    const word = String(body.word ?? '');
    const userPrompt =
      `Target word: "${word}" (${body.pos ?? ''}) — nghĩa Việt: ${body.meaning_vi ?? ''}\n` +
      `Learner sentence: "${body.sentence.trim()}"`;

    // Gọi provider; JSON không hợp lệ thì thử lại 1 lần
    let parsed: Grade | null = null;
    let lastErr = '';
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const raw = await callProvider(provider, model, apiKey, userPrompt);
        parsed = GradeSchema.parse(JSON.parse(raw));
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    if (!parsed) {
      return json({ ok: false, reason: `AI trả lời không đọc được (${lastErr}) — hãy tự chấm` });
    }

    await supabase.from('sentence_attempts').insert({
      user_id: user.id,
      card_id: body.cardId ?? null,
      sentence: body.sentence.trim(),
      provider,
      model,
      score: parsed.score,
      feedback: parsed,
      rating: scoreToRating(parsed.score),
    });

    return json({ ok: true, ...parsed, provider, model });
  } catch (e) {
    return json({ ok: false, reason: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
