// Toàn bộ truy cập dữ liệu phía client tập trung ở đây
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { schedule, emptyCardState, humanizeDue } from '@/lib/fsrs';
import type { CardRow, Rating, StudyMode, StudyQueueItem, UserSettings } from '@/types/db';

const sb = () => getSupabaseBrowserClient();

export interface CardPoolItem {
  word: string;
  meaning_vi: string | null;
  topic: string | null;
  pos: string | null;
}

export async function fetchStudyQueue(topic?: string | null): Promise<StudyQueueItem[]> {
  const { data, error } = await sb().rpc('get_study_queue', {
    p_limit: 100,
    p_topic: topic && topic !== 'all' ? topic : null,
  });
  if (error) throw error;
  return (data ?? []) as StudyQueueItem[];
}

export async function fetchCardPool(): Promise<CardPoolItem[]> {
  const { data, error } = await sb().from('cards').select('word,meaning_vi,topic,pos');
  if (error) throw error;
  return data ?? [];
}

/** Tính FSRS phía client rồi gửi trạng thái mới cho submit_review kiểm chứng. */
export async function submitReview(
  card: StudyQueueItem,
  rating: Rating,
  mode: StudyMode,
  opts?: { answer?: string; elapsedMs?: number; desiredRetention?: number },
): Promise<{ nextDue: string; nextDueLabel: string }> {
  const payload = card.last_review
    ? {
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        last_review: card.last_review,
      }
    : emptyCardState();
  const ns = schedule(payload, rating, opts?.desiredRetention ?? 0.9);
  const { error } = await sb().rpc('submit_review', {
    p_card_id: card.card_id,
    p_rating: rating,
    p_due: ns.due,
    p_stability: ns.stability,
    p_difficulty: ns.difficulty,
    p_state: ns.state,
    p_reps: ns.reps,
    p_lapses: ns.lapses,
    p_mode: mode,
    p_elapsed_ms: Math.round(opts?.elapsedMs ?? 0) || null,
    p_answer: opts?.answer ?? null,
  });
  if (error) throw error;
  return { nextDue: ns.due, nextDueLabel: humanizeDue(ns.due) };
}

export async function fetchSettings(): Promise<UserSettings> {
  const { data, error } = await sb().from('user_settings').select('*').maybeSingle();
  if (error) throw error;
  return data as UserSettings;
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<void> {
  const { error } = await sb()
    .from('user_settings')
    .update({ ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export interface CardFilters {
  search?: string;
  topic?: string;
  level?: string;
}

export async function fetchCards(filters: CardFilters): Promise<CardRow[]> {
  let q = sb().from('cards').select('*').order('word');
  if (filters.topic && filters.topic !== 'all') q = q.eq('topic', filters.topic);
  if (filters.level && filters.level !== 'all') q = q.eq('level', filters.level);
  if (filters.search?.trim()) {
    const s = `%${filters.search.trim()}%`;
    q = q.or(`word.ilike.${s},meaning_vi.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CardRow[];
}

export async function upsertCard(card: Partial<CardRow> & { word: string }): Promise<void> {
  const row: Record<string, unknown> = {
    word: card.word.trim(),
    ipa: card.ipa || null,
    pos: card.pos || null,
    meaning_vi: card.meaning_vi || null,
    definition_en: card.definition_en || null,
    examples: card.examples ?? [],
    collocations: card.collocations ?? [],
    synonyms: card.synonyms ?? [],
    topic: card.topic || null,
    level: card.level || null,
    source: card.source ?? 'manual',
  };
  const { error } = card.id
    ? await sb().from('cards').update(row).eq('id', card.id)
    : await sb().from('cards').insert(row);
  if (error) throw error;
}

export interface AiGradeResult {
  ok: boolean;
  score?: number;
  errors?: string[];
  corrected?: string;
  better_version?: string;
  explanation_vi?: string;
  provider?: string;
  model?: string;
  reason?: string;
}

export async function invokeAiGrade(
  card: StudyQueueItem,
  sentence: string,
): Promise<AiGradeResult> {
  const { data, error } = await sb().functions.invoke('ai-gateway', {
    body: {
      action: 'grade',
      cardId: card.card_id,
      word: card.word,
      meaning_vi: card.meaning_vi,
      pos: card.pos,
      sentence,
    },
  });
  if (error) return { ok: false, reason: error.message };
  return data as AiGradeResult;
}

export async function fetchTodayStats(): Promise<{ dueNow: number; reviewedToday: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const [dueRes, logRes] = await Promise.all([
    sb()
      .from('card_states')
      .select('card_id', { count: 'exact', head: true })
      .neq('state', 0)
      .lte('due', new Date().toISOString()),
    sb()
      .from('review_logs')
      .select('id', { count: 'exact', head: true })
      .gte('reviewed_at', today),
  ]);
  return { dueNow: dueRes.count ?? 0, reviewedToday: logRes.count ?? 0 };
}
