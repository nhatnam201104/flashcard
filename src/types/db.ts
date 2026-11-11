// DB & RPC row types (snake_case khớp Postgres)

export interface CardRow {
  id: number;
  word: string;
  ipa: string | null;
  pos: string | null;
  meaning_vi: string | null;
  definition_en: string | null;
  examples: string[];
  collocations: string[];
  synonyms: string[];
  topic: string | null;
  level: string | null;
  source: string;
  stage: number;
  next_review: string;
  lapses: number;
  last_reviewed: string | null;
  created_at: string;
}

export interface CardStatePayload {
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number; // 0 New | 1 Learning | 2 Review | 3 Relearning
  last_review: string | null;
}

export type StudyQueueItem = CardRow &
  CardStatePayload & { card_id: number; is_new: boolean };

export interface UserSettings {
  user_id: string;
  ai_provider: 'claude' | 'openai' | 'gemini' | 'none'; // default DB: 'gemini'
  ai_model: string | null;
  daily_new_limit: number;
  daily_review_limit: number;
  daily_ai_limit: number;
  desired_retention: number;
  tts_voice: string;
  updated_at: string;
}

export interface SentenceFeedback {
  score: number;
  errors: string[];
  corrected: string;
  better_version: string;
  explanation_vi: string;
}

export type StudyMode = 'flip' | 'type' | 'choice' | 'listen' | 'sentence';

export const STUDY_MODES: { id: StudyMode; label: string; icon: string; hint: string }[] = [
  { id: 'flip', label: 'Lật thẻ', icon: '🔄', hint: 'Tự chấm Again/Hard/Good/Easy' },
  { id: 'type', label: 'Gõ từ', icon: '⌨️', hint: 'Nghĩa Việt → gõ từ tiếng Anh' },
  { id: 'choice', label: 'Trắc nghiệm', icon: '🎯', hint: 'Chọn 1 trong 4 đáp án' },
  { id: 'listen', label: 'Nghe & chép', icon: '🎧', hint: 'Nghe TTS rồi gõ lại' },
  { id: 'sentence', label: 'Đặt câu', icon: '✍️', hint: 'AI chấm ngữ pháp & collocation' },
];

export type Rating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy
