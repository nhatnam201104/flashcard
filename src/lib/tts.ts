// Web Speech API — ưu tiên giọng en-GB, chọn được qua Settings
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function speak(text: string, voiceHint = 'en-GB', rate = 0.9): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = loadVoices();
  const exact = voices.find((v) => v.lang === voiceHint);
  const prefix = voices.find((v) => v.lang.startsWith(voiceHint.slice(0, 2)));
  if (exact || prefix) utter.voice = exact ?? prefix ?? null;
  utter.lang = exact?.lang ?? prefix?.lang ?? voiceHint;
  utter.rate = rate;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}
