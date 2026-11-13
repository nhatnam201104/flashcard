# 🃏 Aptis Flashcard

Web app (PWA) ôn từ vựng **Aptis** bằng thuật toán **FSRS** — nhớ lâu, ôn đúng lúc. Đọc và ghi trực tiếp vào kho từ vựng `aptis-vocab` (Supabase) dùng chung với bài học hằng sáng.

## Tính năng

| Nhóm | Chi tiết |
| --- | --- |
| **Thuật toán FSRS** | `ts-fsrs` phía client tính lịch ôn, server (`submit_review`) kiểm chứng & ghi một transaction; thay hoàn toàn lịch cố định 1-2-4-7-15-30-60-120 |
| **5 chế độ ôn** | Lật thẻ tự chấm · Gõ từ (Việt→Anh, chấp nhận sai chính tả nhỏ) · Trắc nghiệm (nhiễu cùng chủ đề) · Nghe & chép (TTS en-GB) · Đặt câu + AI chấm |
| **Chọn phạm vi ôn** | **Theo từng chủ đề** (Work, Travel, Health…) hoặc **toàn bộ** kho từ |
| **AI chấm câu** | Edge Function `ai-gateway` — 3 provider (OpenAI / Claude / Gemini), JSON validate bằng Zod, retry 1 lần, hết quota thì tự chấm; key chỉ nằm ở Supabase secrets |
| **Quản lý thẻ** | Tìm kiếm, lọc chủ đề/level, thêm/sửa mọi trường; thẻ mới từ routine buổi sáng tự có trạng thái nhờ trigger |
| **Đồng bộ 2 chiều** | `card_states` là nguồn sự thật (FSRS); `submit_review` ghi ngược `cards.next_review` để routine buổi sáng vẫn đúng; routine `mark_reviewed` ghi `review_logs` mode `lesson` và đẩy lịch app |
| **PWA** | Cài ra màn hình chính điện thoại, manifest + icon |
| **Bảo mật** | RLS mọi bảng mới theo `auth.uid() = user_id`; magic link (Supabase Auth) |

## Kiến trúc

```
Next.js 16 (App Router, TS, Tailwind 4, shadcn/ui, Framer Motion)
        │  supabase-js + TanStack Query
        ▼
Supabase ── Postgres: cards, daily_sessions (có sẵn)
   │          + card_states, review_logs, sentence_attempts, user_settings (mới, RLS)
   │          + RPC: get_study_queue(limit, mode, topic), submit_review(...),
   │                 fsrs_bootstrap(), trigger trên cards
   └── Edge Function `ai-gateway` (Deno): giữ API key AI, không bao giờ xuống client
```

## Chạy local

Yêu cầu: Node 22+, Docker, Supabase CLI.

```bash
npm install
npx supabase start          # Docker: Postgres + Auth + REST + Edge Runtime + Inbucket
npx supabase db reset       # migrations + seed: 100 từ Aptis + user test
cp .env.example .env.local  # điền URL + anon key từ `supabase status`
npm run dev                 # http://localhost:3000
```

**Tài khoản seed:** `nam@test.local` / `aptis2026` (tab "Đăng nhập"). Magic link thật xem tại Inbucket `http://127.0.0.1:54324`.

AI chấm câu local:

```bash
export OPENAI_API_KEY=sk-...   # hoặc ANTHROPIC_API_KEY / GEMINI_API_KEY
npx supabase functions serve ai-gateway --env-file ./supabase/functions/.env --no-verify-jwt
```

Chưa đặt key? Chế độ đặt câu tự chuyển sang **tự chấm** — không crash, không tốn tiền.

## Test

```bash
npm test        # Vitest: 21 test — quy đổi điểm từng chế độ sang FSRS, ngưỡng sai chính tả, distractors, lịch FSRS
```

Backend đã được smoke-test qua REST: queue đúng giới hạn ngày, lọc chủ đề, reject input sai, đồng bộ ngược `cards`, không ghi double-log (trigger lesson có cờ `app.skip_lesson_trigger`).

## Deploy lên DB aptis-vocab thật

> Nguyên tắc: **chỉ thêm**, không sửa bảng/hàm cũ — routine buổi sáng chạy nguyên như cũ.

```bash
supabase link --project-ref <ref>
supabase db pull                       # kéo schema thật làm migration base (thay cho 00000000000001_base_shim.sql)
supabase push                           # chạy 2 file flashcard_tables + flashcard_rpcs
select fsrs_bootstrap();               -- quy đổi 194 thẻ cũ sang FSRS (idempotent)
supabase secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=...
supabase functions deploy ai-gateway
```

### Frontend — GitHub Pages

App build dạng **static export** (`output: 'export'`) — không có server Next.js: chặn đăng nhập chạy ở client ([AuthGuard](src/components/AuthGuard.tsx)), dữ liệu được bảo vệ bằng RLS của Supabase.

Workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) tự build + deploy mỗi lần push lên `main`. Cài đặt một lần:

1. GitHub repo → **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (key public, vẫn an toàn nhờ RLS).
3. Supabase Dashboard → **Authentication → URL Configuration**: Site URL = `https://<user>.github.io/<repo>/`, thêm Redirect URL `https://<user>.github.io/<repo>/**`.

Build thử local giống CI (Git Bash cần `MSYS_NO_PATHCONV=1` để không đổi `/flashcard` thành đường dẫn Windows):

```bash
MSYS_NO_PATHCONV=1 NEXT_PUBLIC_BASE_PATH=/flashcard npx next build   # → out/
```

## Lộ trình (giai đoạn 2)

- [ ] Ôn offline + hàng đợi IndexedDB đồng bộ sau (Serwist)
- [ ] AI sinh nội dung thẻ mới
- [ ] Playwright E2E + CI GitHub Actions
- [ ] Thống kê heatmap, tối ưu tham số FSRS từ `review_logs`
- [ ] Đa người dùng thật (schema đã sẵn `user_id` mọi bảng)
