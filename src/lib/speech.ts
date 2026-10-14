import type { Locale } from './preferences';

export const speechLanguages: Record<Locale, string> = {
  en: 'en-NG',
  pcm: 'pcm-NG',
  yo: 'yo-NG',
  ha: 'ha-NG',
  ig: 'ig-NG',
  fr: 'fr-FR',
};
export function matchingVoice<T extends { lang: string }>(
  voices: T[],
  locale: Locale,
): T | undefined {
  const tag = speechLanguages[locale].toLowerCase();
  return (
    voices.find((voice) => voice.lang.replaceAll('_', '-').toLowerCase() === tag) ??
    voices.find((voice) => voice.lang.replaceAll('_', '-').toLowerCase().split('-')[0] === locale)
  );
}
export function speechChunks(text: string): string[] {
  const chunks: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (!chunks.length || chunks[chunks.length - 1].length + word.length + 1 > 220)
      chunks.push(word);
    else chunks[chunks.length - 1] += ` ${word}`;
  }
  return chunks;
}
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void)
    | null;
  start(): void;
  stop(): void;
  abort(): void;
};
export type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
