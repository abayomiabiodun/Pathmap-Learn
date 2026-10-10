import { expect, it } from 'vitest';
import fs from 'node:fs';
import {
  courseProgress,
  emptyProgress,
  lessonIds,
  lessonKey,
  readProgress,
  validPath,
} from '@/lib/learning';
import { pathIds } from '@/lib/quiz';
import { locales } from '@/lib/preferences';

it('recovers safely from absent, corrupt and incorrectly shaped progress', () => {
  for (const raw of [
    null,
    '{',
    '{"version":2,"lessons":{}}',
    '{"version":1,"lessons":{"web/html":{"draft":3,"completed":true}}}',
  ])
    expect(readProgress(raw)).toEqual(emptyProgress);
  const progress = {
    version: 1,
    lessons: { 'web/html': { draft: 'My first page and reflection', completed: true } },
  };
  expect(readProgress(JSON.stringify(progress))).toEqual(progress);
});
it('counts only completed lessons in the chosen course and resumes the first unfinished lesson', () => {
  expect(courseProgress('web', emptyProgress)).toEqual({ completed: 0, total: 3, next: 'html' });
  const progress = {
    version: 1 as const,
    lessons: {
      'web/html': { draft: 'Saved work', completed: true },
      'web/css': { draft: 'Unfinished work', completed: false },
      'data/data': { draft: 'Another course', completed: true },
    },
  };
  expect(courseProgress('web', progress)).toEqual({ completed: 1, total: 3, next: 'css' });
  expect(courseProgress('data', progress)).toEqual({ completed: 1, total: 1, next: 'data' });
  expect(lessonKey('web', 'html')).toBe('web/html');
  expect(validPath('web')).toBe(true);
  expect(validPath('unknown')).toBe(false);
});
it('every path has real lesson content and an assessment in every supported language', () => {
  const ids = [...new Set(pathIds.flatMap((path) => lessonIds[path]))].sort();
  for (const locale of locales) {
    const lessons = JSON.parse(fs.readFileSync(`public/lessons/${locale}.json`, 'utf8'));
    expect(Object.keys(lessons).sort()).toEqual(ids);
    for (const id of ids) {
      for (const field of ['title', 'body', 'practice', 'statement'])
        expect(lessons[id][field].length).toBeGreaterThan(
          field === 'title' ? 5 : field === 'body' ? 100 : field === 'statement' ? 20 : 40,
        );
      expect(typeof lessons[id].answer).toBe('boolean');
    }
  }
});
