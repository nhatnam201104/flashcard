-- ============================================================================
-- 00000000000002_flashcard_tables.sql
-- Bảng mới của app flashcard: card_states, review_logs, sentence_attempts,
-- user_settings + RLS + trigger. CHỈ THÊM, KHÔNG SỬA bảng/hàm cũ.
-- ============================================================================

-- Trạng thái FSRS của từng thẻ theo từng user (nguồn sự thật của lịch ôn)
-- Lưu ý: cards.id của kho aptis-vocab là bigint
create table public.card_states (
  user_id    uuid not null references auth.users(id) on delete cascade,
  card_id    bigint not null references public.cards(id) on delete cascade,
  due        timestamptz not null default now(),
  stability  double precision not null default 0,
  difficulty double precision not null default 5,
  reps       int not null default 0,
  lapses     int not null default 0,
  state      smallint not null default 0,   -- 0 New | 1 Learning | 2 Review | 3 Relearning
  last_review timestamptz,
  primary key (user_id, card_id)
);

create index card_states_due_idx  on public.card_states (user_id, due);
create index card_states_new_idx  on public.card_states (user_id, state) where state = 0;

-- Mỗi lần ôn một dòng
create table public.review_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_id     bigint not null references public.cards(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 4),  -- 1 Again..4 Easy
  mode        text not null default 'flip',   -- flip|type|choice|listen|sentence|lesson
  answer      text,
  elapsed_ms  int,
  reviewed_at timestamptz not null default now()
);

create index review_logs_user_time_idx on public.review_logs (user_id, reviewed_at desc);
create index review_logs_card_idx      on public.review_logs (card_id);

-- Câu người dùng đặt + kết quả AI chấm
create table public.sentence_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  card_id    bigint not null references public.cards(id) on delete cascade,
  sentence   text not null,
  provider   text,
  model      text,
  score      int check (score between 0 and 10),
  feedback   jsonb,   -- { errors[], corrected, better_version, explanation_vi }
  rating     smallint check (rating is null or rating between 1 and 4),
  created_at timestamptz not null default now()
);

create index sentence_attempts_user_time_idx on public.sentence_attempts (user_id, created_at desc);
create index sentence_attempts_card_idx      on public.sentence_attempts (card_id, created_at desc);

-- Cấu hình app (KHÔNG chứa API key — key nằm ở Supabase secrets)
create table public.user_settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  ai_provider       text not null default 'gemini',   -- claude|openai|gemini|none
  ai_model          text,
  daily_new_limit   int not null default 10 check (daily_new_limit between 0 and 200),
  daily_review_limit int not null default 100 check (daily_review_limit between 0 and 1000),
  daily_ai_limit    int not null default 50  check (daily_ai_limit between 0 and 1000),
  desired_retention double precision not null default 0.9 check (desired_retention between 0.7 and 0.99),
  tts_voice         text not null default 'en-GB',
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: mọi bảng mới khoá chặt theo user
-- ---------------------------------------------------------------------------
alter table public.card_states        enable row level security;
alter table public.review_logs        enable row level security;
alter table public.sentence_attempts  enable row level security;
alter table public.user_settings      enable row level security;

create policy "card_states_all"        on public.card_states       for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "review_logs_select"     on public.review_logs       for select to authenticated using (user_id = auth.uid());
create policy "review_logs_insert"     on public.review_logs       for insert to authenticated with check (user_id = auth.uid());
create policy "sentences_select"       on public.sentence_attempts for select to authenticated using (user_id = auth.uid());
create policy "sentences_insert"       on public.sentence_attempts for insert to authenticated with check (user_id = auth.uid());
create policy "settings_select"        on public.user_settings     for select to authenticated using (user_id = auth.uid());
create policy "settings_update"        on public.user_settings     for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings_insert"        on public.user_settings     for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tự tạo hàng user_settings khi có user mới
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Thẻ mới (từ ingest_cards của routine buổi sáng) tự có card_states New
-- cho từng user hiện có
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_card()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into card_states (card_id, user_id)
  select new.id, u.id from auth.users u
  on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_card_created
  after insert on public.cards
  for each row execute function public.handle_new_card();
