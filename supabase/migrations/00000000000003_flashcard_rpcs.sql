-- ============================================================================
-- 00000000000003_flashcard_rpcs.sql
-- RPC chính: fsrs_bootstrap, get_study_queue (có lọc chủ đề), submit_review
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fsrs_bootstrap(): quy đổi 194 thẻ cũ (stage/next_review, lịch 1-2-4-7-15-30-60-120)
-- sang trạng thái FSRS ban đầu. Idempotent — chạy lại không sinh trùng.
-- ---------------------------------------------------------------------------
create or replace function public.fsrs_bootstrap()
returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ins as (
    insert into card_states (card_id, user_id, due, stability, difficulty,
                             reps, lapses, state, last_review)
    select
      c.id,
      u.id,
      coalesce(c.next_review, current_date)::timestamptz + interval '9 hour',
      case when coalesce(c.stage, 0) = 0 then 0
           else (array[1, 3, 7, 15, 30, 60, 120])[least(coalesce(c.stage, 0), 7)] end,
      5.0,
      case when coalesce(c.stage, 0) = 0 then 0 else coalesce(c.stage, 0) end,
      coalesce(c.lapses, 0),
      case when coalesce(c.stage, 0) = 0 then 0 else 2 end,   -- New | Review
      c.last_reviewed
    from cards c cross join auth.users u
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

-- Đổi return type (jsonb → text[] cho collocations/synonyms) phải drop hàm cũ
drop function if exists public.get_study_queue(int, text, text);
create or replace function public.get_study_queue(
  p_limit int default 50,
  p_mode  text default null,
  p_topic text default null
)
returns table (
  card_id bigint, word text, ipa text, pos text,
  meaning_vi text, definition_en text,
  examples jsonb, collocations text[], synonyms text[],
  topic text, level text,
  due timestamptz, stability double precision, difficulty double precision,
  reps int, lapses int, state smallint, last_review timestamptz,
  is_new boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_review_limit int;
  v_new_limit int;
  v_new_used int;
begin
  select coalesce(max(daily_review_limit), 100), coalesce(max(daily_new_limit), 10)
    into v_review_limit, v_new_limit
  from user_settings where user_id = auth.uid();

  -- Số thẻ mới đã vào học trong hôm nay (reps = 1 và vừa review hôm nay)
  select coalesce(count(distinct l.card_id), 0) into v_new_used
  from review_logs l
  join card_states cs on cs.card_id = l.card_id and cs.user_id = auth.uid()
  where l.user_id = auth.uid()
    and l.mode <> 'lesson'
    and l.reviewed_at >= current_date
    and cs.reps = 1
    and cs.last_review >= current_date;

  return query
  with base as (
    select c.id, c.word, c.ipa, c.pos, c.meaning_vi, c.definition_en,
           c.examples, c.collocations, c.synonyms, c.topic, c.level, c.created_at,
           cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses, cs.state, cs.last_review
    from card_states cs
    join cards c on c.id = cs.card_id
    where cs.user_id = auth.uid()
      and (p_topic is null or btrim(p_topic) = '' or c.topic = btrim(p_topic))
  ),
  reviews as (
    select * from base
    where base.state <> 0 and base.due <= now()
    order by base.due asc
    limit least(coalesce(p_limit, 50), v_review_limit)
  ),
  news as (
    select * from base
    where base.state = 0
    order by base.created_at asc
    limit greatest(v_new_limit - v_new_used, 0)
  ),
  chosen as (select * from reviews union all select * from news)
  select b.id, b.word, b.ipa, b.pos, b.meaning_vi, b.definition_en,
         b.examples, b.collocations, b.synonyms, b.topic, b.level,
         b.due, b.stability, b.difficulty, b.reps, b.lapses, b.state, b.last_review,
         (b.state = 0) as is_new
  from chosen b
  order by (b.state = 0), b.due asc;
end;
$$;

grant execute on function public.get_study_queue(int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_review(): app tính FSRS bằng ts-fsrs rồi gửi trạng thái mới lên;
-- server kiểm chứng, ghi review_logs, cập nhật card_states và đồng bộ ngược
-- cards.next_review/lapses/last_reviewed trong MỘT transaction.
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(
  p_card_id    bigint,
  p_rating     smallint,
  p_due        timestamptz,
  p_stability  double precision,
  p_difficulty double precision,
  p_state      smallint,
  p_reps       int,
  p_lapses     int,
  p_mode       text default 'flip',
  p_elapsed_ms int default null,
  p_answer     text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Kiểm chứng dữ liệu từ client
  if p_rating not between 1 and 4 then
    raise exception 'rating phải nằm trong 1..4';
  end if;
  if p_state not between 0 and 3 then
    raise exception 'state phải nằm trong 0..3';
  end if;
  if p_stability < 0 or p_stability > 365 then
    raise exception 'stability ngoài khoảng hợp lệ (0..365)';
  end if;
  if p_difficulty < 1 or p_difficulty > 10 then
    raise exception 'difficulty ngoài khoảng hợp lệ (1..10)';
  end if;
  if p_reps < 0 or p_lapses < 0 then
    raise exception 'reps/lapses không được âm';
  end if;
  if p_due < now() - interval '1 day' or p_due > now() + interval '365 day' then
    raise exception 'due ngoài khoảng hợp lệ';
  end if;
  if not exists (select 1 from card_states where user_id = auth.uid() and card_id = p_card_id) then
    raise exception 'thẻ không tồn tại hoặc không thuộc quyền sở hữu';
  end if;

  insert into review_logs (user_id, card_id, rating, mode, answer, elapsed_ms)
  values (auth.uid(), p_card_id, p_rating, coalesce(p_mode, 'flip'), p_answer, p_elapsed_ms);

  update card_states set
    due = p_due, stability = p_stability, difficulty = p_difficulty,
    state = p_state, reps = p_reps, lapses = p_lapses, last_review = now()
  where user_id = auth.uid() and card_id = p_card_id;

  -- Đồng bộ ngược để routine buổi sáng (đọc cards.next_review) vẫn đúng.
  -- Cờ transaction-local để trigger on_card_lesson_reviewed bỏ qua update này
  -- (chỉ routine buổi sáng qua mark_reviewed mới được ghi log 'lesson').
  perform set_config('app.skip_lesson_trigger', 'on', true);
  update cards set
    next_review   = p_due::date,
    lapses        = p_lapses,
    last_reviewed = now()
  where id = p_card_id;
  perform set_config('app.skip_lesson_trigger', 'off', true);
end;
$$;

grant execute on function public.submit_review(bigint, smallint, timestamptz, double precision, double precision, smallint, int, int, text, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Ghi nhận khi routine buổi sáng gọi mark_reviewed (mode = 'lesson')
-- để app biết từ đó đã được ôn trong bài học, đẩy lịch app sang hôm sau
-- ---------------------------------------------------------------------------
create or replace function public.log_lesson_review()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  -- Update từ submit_review của app: bỏ qua
  if coalesce(current_setting('app.skip_lesson_trigger', true), 'off') = 'on' then
    return new;
  end if;

  if new.next_review is distinct from old.next_review and new.last_reviewed is distinct from old.last_reviewed then
    -- ôn qua routine: ghi log lesson cho mọi user (MVP: 1 user)
    foreach v_user in array (select array_agg(id) from auth.users) loop
      insert into review_logs (user_id, card_id, rating, mode)
      values (v_user, new.id, 3, 'lesson');
      update card_states set due = greatest(due, new.next_review::timestamptz + interval '9 hour')
      where user_id = v_user and card_id = new.id and state <> 0;
    end loop;
  end if;
  return new;
end;
$$;

-- Chỉ gắn ở DB local (shim). Với DB thật: xem README — gắn tương tự,
-- trigger AFTER UPDATE trên cards do mark_reviewed gọi.
create or replace trigger on_card_lesson_reviewed
  after update on public.cards
  for each row execute function public.log_lesson_review();
