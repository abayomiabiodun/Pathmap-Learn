import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { answerQuestion, lessonKnowledge, guides, normalize } from '../src/lib/assistant';
import type { Lesson } from '../src/lib/learning';

const catalog = (locale: string): Record<string, Lesson> =>
  JSON.parse(fs.readFileSync(`public/lessons/${locale}.json`, 'utf8'));
for (const locale of ['en', 'pcm', 'yo', 'ha', 'ig', 'fr']) {
  describe(locale, () => {
    const lessons = lessonKnowledge(catalog(locale));
    const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));
    const documents = [
      ...lessons,
      ...guides.map(([id, href, key]) => ({
        id: `guide-${id}`,
        href,
        title: messages[key],
        body: messages[`assistant_guide_${id}`],
      })),
    ];
    it('indexes all 100 translated lessons and grounds answers in their material', () => {
      expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(100);
      const result = answerQuestion('HTML', documents);
      expect(result.sources[0].id).toBe('html');
      expect(result.sources[0].body).toBe(catalog(locale).html.body);
      expect(result.sources[0].href).toBe('/learn/web?lesson=html');
      expect(result.sources[0]).not.toHaveProperty('answer');
    });
    it('matches localized navigation prompts', () => {
      expect(
        answerQuestion(messages.assistant_prompt_navigation, documents).sources.map(
          (source) => source.id,
        ),
      ).toContain('guide-learning');
      expect(
        answerQuestion(messages.assistant_prompt_mentor, documents).sources.map(
          (source) => source.id,
        ),
      ).toContain('guide-mentor');
    });
  });
}
it('does not invent material for unknown questions or leak other course results through a filter', () => {
  const documents = lessonKnowledge(catalog('en'));
  expect(answerQuestion('xzqv 999999999999 salary lottery', documents).sources).toEqual([]);
  expect(answerQuestion('Explain HTML', documents, undefined, 'data').sources).toEqual([]);
  expect(answerQuestion('What does href mean?', documents).sources[0].id).toBe('html');
});
it('continues the previous topic for an example but changes topic for an explicit question', () => {
  const documents = lessonKnowledge(catalog('en'));
  expect(answerQuestion('Give an example', documents, 'html').sources[0].id).toBe('html');
  expect(answerQuestion('Explain CSS', documents, 'html').sources[0].id).toBe('css');
  expect(answerQuestion('Give a CSS example', documents, 'html').sources[0].id).toBe('css');
  expect(answerQuestion('example xzqv wwww', documents, 'html').sources).toEqual([]);
  expect(answerQuestion('I am stuck', documents, 'html').sources[0].id).toBe('html');
  expect(answerQuestion('Give an example', documents, 'html', 'data').sources).toEqual([]);
  expect(answerQuestion('Give an example', documents, 'data', 'data').sources[0].id).toBe('data');
  expect(answerQuestion('', documents).sources).toEqual([]);
  expect(lessonKnowledge({})).toEqual([]);
  expect(answerQuestion('Give an example', documents).sources).toEqual([]);
  expect(normalize('Àpẹẹrẹ')).toBe('apeere');
});
