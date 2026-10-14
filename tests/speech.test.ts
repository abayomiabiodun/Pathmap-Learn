import { expect, it } from 'vitest';
import { matchingVoice, speechChunks, speechLanguages } from '../src/lib/speech';
import { locales } from '../src/lib/preferences';
for (const locale of locales) {
  it(`selects a matching ${locale} voice without substituting another language`, () => {
    const exact = { lang: speechLanguages[locale] };
    expect(matchingVoice([{ lang: 'de-DE' }, exact], locale)).toBe(exact);
    expect(matchingVoice([{ lang: locale + '_XX' }], locale)?.lang).toBe(locale + '_XX');
    expect(matchingVoice([{ lang: 'de-DE' }], locale)).toBeUndefined();
    expect(matchingVoice([], locale)).toBeUndefined();
  });
}
it('splits long answers into ordered speech chunks without losing words', () => {
  const text = Array.from({ length: 150 }, (_, index) => `word${index}`).join(' ');
  expect(speechChunks(text).join(' ')).toBe(text);
  expect(speechChunks(text).every((chunk) => chunk.length <= 220)).toBe(true);
  expect(speechChunks('  ')).toEqual([]);
  expect(speechChunks(`${'a'.repeat(210)} ${'b'.repeat(10)}`)).toHaveLength(2);
  expect(matchingVoice([{ lang: 'en-US' }], 'pcm')).toBeUndefined();
});
