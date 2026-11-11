-- ============================================================================
-- 00000000000001_base_shim.sql
-- LOCAL DEV SHIM: dựng lại tối giản lược đồ aptis-vocab hiện có
-- (cards, daily_sessions + 4 hàm legacy) để chạy Supabase local.
--
-- ⚠ Khi làm với DB aptis-vocab THẬT: KHÔNG chạy file này.
--   Thay bằng: `supabase db pull` để kéo schema gốc làm migration base.
--   Hai file 00000000000002 và 00000000000003 chạy nguyên vẹn trên cả hai.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Bảng có sẵn (dựng lại theo schema thật đã mô tả trong kế hoạch)
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id             bigint generated always as identity primary key,
  word           text not null unique,
  ipa            text,
  pos            text,
  meaning_vi     text,
  definition_en  text,
  examples       jsonb not null default '[]'::jsonb,
  collocations   text[] not null default '{}',
  synonyms       text[] not null default '{}',
  topic          text,
  level          text,
  source         text not null default 'manual',
  learned_on     date,
  stage          int  not null default 0,
  next_review    date not null default current_date,
  review_count   int  not null default 0,
  lapses         int  not null default 0,
  last_reviewed  date,
  created_at     timestamptz not null default now()
);

create index if not exists cards_topic_idx   on public.cards (topic);
create index if not exists cards_due_idx     on public.cards (next_review);

create table if not exists public.daily_sessions (
  id            bigint generated always as identity primary key,
  session_date  date not null unique default current_date,
  topic         text,
  grammar_point text,
  new_words     jsonb not null default '[]'::jsonb,
  review_words  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.cards          enable row level security;
alter table public.daily_sessions enable row level security;

-- Kho chung của một người dùng duy nhất (MVP): authenticated được đọc/sửa
create policy "cards_select_authenticated"  on public.cards for select to authenticated using (true);
create policy "cards_insert_authenticated"  on public.cards for insert to authenticated with check (true);
create policy "cards_update_authenticated"  on public.cards for update to authenticated using (true);
create policy "sessions_select_authenticated" on public.daily_sessions for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4 hàm legacy (shim: giữ chữ ký và hành vi tối giản để routine buổi sáng
-- vẫn chạy; DB thật đã có bản đầy đủ — file này chỉ dùng local)
-- ---------------------------------------------------------------------------
create or replace function public.get_review_digest()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'word', c.word, 'ipa', c.ipa, 'pos', c.pos,
    'meaning_vi', c.meaning_vi, 'definition_en', c.definition_en,
    'examples', c.examples, 'collocations', c.collocations, 'synonyms', c.synonyms,
    'topic', c.topic, 'level', c.level, 'stage', c.stage
  ) order by c.word), '[]'::jsonb)
  from cards c
  where c.next_review <= current_date;
$$;

create or replace function public.ingest_cards(p_cards jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with v as (
    select
      (x->>'word')::text                                   as word,
      nullif(x->>'ipa', '')                                as ipa,
      nullif(x->>'pos', '')                                as pos,
      nullif(x->>'meaning_vi', '')                         as meaning_vi,
      nullif(x->>'definition_en', '')                      as definition_en,
      coalesce(x->'examples', '[]'::jsonb)                 as examples,
      coalesce(x->'collocations', '[]'::jsonb)             as collocations,
      coalesce(x->'synonyms', '[]'::jsonb)                 as synonyms,
      nullif(x->>'topic', '')                              as topic,
      nullif(x->>'level', '')                              as level,
      nullif(x->>'source', '')                             as source
    from jsonb_array_elements(p_cards) x
  ),
  ins as (
    insert into cards (word, ipa, pos, meaning_vi, definition_en,
                       examples, collocations, synonyms, topic, level, source)
    select word, ipa, pos, meaning_vi, definition_en,
           examples, collocations, synonyms, topic, level,
           coalesce(source, 'lesson')
    from v
    on conflict (word) do update set
      ipa           = coalesce(excluded.ipa, cards.ipa),
      pos           = coalesce(excluded.pos, cards.pos),
      meaning_vi    = coalesce(excluded.meaning_vi, cards.meaning_vi),
      definition_en = coalesce(excluded.definition_en, cards.definition_en),
      examples      = case when jsonb_array_length(excluded.examples) > 0
                           then excluded.examples else cards.examples end,
      collocations  = case when jsonb_array_length(excluded.collocations) > 0
                           then excluded.collocations else cards.collocations end,
      synonyms      = case when jsonb_array_length(excluded.synonyms) > 0
                           then excluded.synonyms else cards.synonyms end,
      topic         = coalesce(excluded.topic, cards.topic),
      level         = coalesce(excluded.level, cards.level)
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

create or replace function public.mark_reviewed(p_card_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update cards set
    stage         = stage + 1,
    next_review   = current_date + (array[1,2,4,7,15,30,60,120])[least(stage + 1, 8)],
    last_reviewed = now()
  where id = p_card_id;
end;
$$;

create or replace function public.log_session(
  p_topic text, p_grammar_point text,
  p_new_words jsonb default '[]'::jsonb, p_review_words jsonb default '[]'::jsonb
)
returns void
language sql security definer set search_path = public as $$
  insert into daily_sessions (session_date, topic, grammar_point, new_words, review_words)
  values (current_date, p_topic, p_grammar_point, p_new_words, p_review_words)
  on conflict (session_date) do update set
    topic = excluded.topic, grammar_point = excluded.grammar_point;
$$;
